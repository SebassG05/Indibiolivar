const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST /api/maxent/distribution
router.post('/distribution', async (req, res) => {
  try {
    console.log('POST /api/maxent/distribution body:', req.body);
    const { species, aoi, variables, features, betaMultiplier } = req.body;
    if (!species) return res.status(400).json({ error: 'species is required' });

    // 1. Get taxonKey from GBIF
    const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(species)}`;
    console.log('GBIF matchUrl:', matchUrl);
    const matchResp = await axios.get(matchUrl);
    const taxonKey = matchResp.data.usageKey;
    console.log('GBIF matchResp:', matchResp.data);
    if (!taxonKey) return res.status(404).json({ error: 'No taxonKey found for species' });

    // 2. Get occurrences (distribution)
    // Optionally filter by AOI/country if provided
    let occUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&limit=300`;
    // Solo añadir country si AOI es un código de país ISO 2 letras
    if (aoi && /^[A-Z]{2}$/i.test(aoi.trim())) {
      occUrl += `&country=${aoi.trim().toUpperCase()}`;
    }
    console.log('GBIF occUrl:', occUrl);
    const occResp = await axios.get(occUrl);
    const occurrences = occResp.data.results.map(o => ({
      lat: o.decimalLatitude,
      lng: o.decimalLongitude,
      key: o.key,
      country: o.country,
      date: o.eventDate
    })).filter(o => o.lat && o.lng);
    console.log('GBIF occurrences:', occurrences.length);

    res.json({
      taxonKey,
      occurrences,
      variables,
      features,
      betaMultiplier
    });
  } catch (err) {
    console.error('Error in /api/maxent/distribution:', err);
    res.status(500).json({ error: err.message, details: err.response && err.response.data });
  }
});

module.exports = router;
