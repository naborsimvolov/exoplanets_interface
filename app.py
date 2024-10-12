from flask import Flask, render_template, request, send_file
from io import BytesIO

app = Flask(__name__)
app.secret_key = 'secret_key'

# example exoplanet data
exoplanets = ['Kepler-22b', 'Proxima b', 'TRAPPIST-1e']

@app.route('/')
def index():
    return render_template('index.html', exoplanets=exoplanets)

@app.route('/star_chart', methods=['POST'])
def star_chart():
    exoplanet = request.form.get('exoplanet')
    return render_template('star_chart.html', exoplanet=exoplanet)

# Additional route to handle image export
@app.route('/export_image', methods=['POST'])
def export_image():
    image_data = request.form.get('imageData')
    image = BytesIO()
    image.write(image_data.encode('utf-8'))
    image.seek(0)
    return send_file(image, mimetype='image/png', as_attachment=True, download_name='star_chart_with_constellations.png')

if __name__ == '__main__':
    app.run(debug=True)