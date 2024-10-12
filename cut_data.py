import pandas as pd

file_path = 'exoplanet.csv'

exoplanet_data = pd.read_csv(file_path, skiprows=50, on_bad_lines='skip')

exoplanet_data.columns = [
    'Planet Name', 'Host Name', 'RA', 'DEC', 'Distance [pc]', 'Distance Upper Unc [pc]', 'Distance Lower Unc [pc]'
]

exoplanet_data_cleaned = exoplanet_data.dropna(subset=['Planet Name', 'Host Name'])

exoplanet_sample = exoplanet_data_cleaned.sample(n=1000, random_state=42)

exoplanet_sample.to_csv('exoplanets_shortened.csv', index=False)

print(exoplanet_sample.head())