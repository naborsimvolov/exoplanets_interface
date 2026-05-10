import pandas as pd
import json

IMAGE_WIDTH = 16384
IMAGE_HEIGHT = 8192

column_names_extra = [
    'pl_name', 'hostname', 'discoverymethod', 'disc_year', 'pl_orbper', 'pl_orbpererr1', 'pl_orbpererr2',
    'pl_orbperlim', 'pl_orbsmax', 'pl_orbsmaxerr1', 'pl_orbsmaxerr2', 'pl_orbsmaxlim', 'pl_rade',
    'pl_radeerr1', 'pl_radeerr2', 'pl_radelim', 'pl_masse', 'pl_masseerr1', 'pl_masseerr2', 'pl_masselim',
    'pl_dens', 'pl_denserr1', 'pl_denserr2', 'pl_denslim', 'pl_orbeccen', 'pl_orbeccenerr1', 'pl_orbeccenerr2',
    'pl_orbeccenlim', 'pl_eqt', 'pl_eqterr1', 'pl_eqterr2', 'pl_eqtlim', 'pl_orbincl', 'pl_orbinclerr1',
    'pl_orbinclerr2', 'pl_orbincllim', 'st_teff', 'st_tefferr1', 'st_tefferr2', 'st_tefflim'
]

column_names_positions = [
    'pl_name', 'hostname', 'ra', 'dec', 'sy_dist', 'sy_disterr1', 'sy_disterr2'
]

df_extra = pd.read_csv('unworked_extra_data.csv', skiprows=51, names=column_names_extra, comment='#', na_values=[''])
df_positions = pd.read_csv('exoplanet.csv', skiprows=51, names=column_names_positions, comment='#', na_values=[''])
df_merged = pd.merge(df_positions, df_extra, on=['pl_name', 'hostname'], how='inner')

df_merged['ra'] = pd.to_numeric(df_merged['ra'], errors='coerce')
df_merged['dec'] = pd.to_numeric(df_merged['dec'], errors='coerce')

df_merged = df_merged.dropna(subset=['ra', 'dec'])

df_unique_planets = df_merged.drop_duplicates(subset=['pl_name', 'hostname'])
df_sample = df_unique_planets.sample(n=min(1000, len(df_unique_planets)), random_state=42)

def ra_dec_to_xy(ra, dec):
    x = IMAGE_WIDTH - (ra / 360.0) * IMAGE_WIDTH
    y = ((90 - dec) / 180.0) * IMAGE_HEIGHT
    return x, y
fields_to_include = [
    'pl_name', 'hostname', 'ra', 'dec', 'discoverymethod', 'disc_year', 'pl_orbper', 'pl_orbsmax', 'pl_rade',
    'pl_masse', 'pl_dens', 'pl_orbeccen', 'st_teff', 'sy_dist'
]

def round_numbers(data_dict):
    for key, value in data_dict.items():
        if isinstance(value, float):
            data_dict[key] = round(value, 6)
    return data_dict

planets = []
for index, row in df_sample.iterrows():
    ra = row['ra']
    dec = row['dec']
    x, y = ra_dec_to_xy(ra, dec)
    data = row[fields_to_include].dropna().to_dict()
    data = round_numbers(data)
    planet = {
        'name': row['pl_name'],
        'x': x,
        'y': y,
        'data': data
    }
    planets.append(planet)

json_output_path = 'planets_1000.json'
with open(json_output_path, 'w') as f:
    json.dump(planets, f)

print("JSON file has been successfully saved at:", json_output_path)