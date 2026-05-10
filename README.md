# Interactive Exoplanet Map

NASA Space Apps 2024 prototype: an interactive canvas map for exploring exoplanets using RA/DEC data and sky-map layers.

## Overview

This project visualizes exoplanets on a zoomable and pannable sky map. Planet positions are generated from right ascension and declination values, then displayed on top of sky-map image layers. Users can switch between map layers, toggle constellation overlays, navigate with buttons or keyboard controls, and click planets to inspect scientific metadata.

## Features

- Interactive canvas-based sky map
- Zoom and pan controls
- Keyboard navigation
- Minimap viewport
- Switchable sky-map layers
- Optional constellation overlay
- Exoplanet popup with scientific data
- Python preprocessing script for converting RA/DEC data into map coordinates

## Tech Stack

Frontend:

- HTML
- CSS
- JavaScript Canvas API

Data preprocessing:

- Python
- pandas

## Project Structure

```text
exoplanets_interface/
  assets/
    constellations.png
    gamma_ray_starmap.png
    starmap.jpg

  data/
    exoplanet.csv
    planets_1000.json
    unworked_extra_data.csv

  scripts/
    prepare_exoplanet_data.py

  src/
    script.js

  styles/
    style.css

  index.html
  requirements.txt