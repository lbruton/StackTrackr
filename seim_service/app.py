import os
import uuid
from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for
from werkzeug.utils import secure_filename
from processor import parse_csv, compute_summary, plot_summary

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
PLOT_FOLDER = os.path.join(os.path.dirname(__file__), 'plots')
ALLOWED_EXTENSIONS = {'csv'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PLOT_FOLDER, exist_ok=True)

app = Flask(__name__, template_folder='templates')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PLOT_FOLDER'] = PLOT_FOLDER


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    # Accept a CSV file and parameters for processing
    if 'file' not in request.files:
        return jsonify({'error': 'no file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'no selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'file must be CSV'}), 400

    filename = secure_filename(file.filename)
    uid = uuid.uuid4().hex
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uid}-{filename}")
    file.save(save_path)

    # Parameters
    group_by = request.form.get('group_by')  # comma-separated column names
    time_col = request.form.get('time_col')  # optional time column
    top_n = int(request.form.get('top_n') or 10)

    # Parse and compute
    df = parse_csv(save_path)
    if df is None:
        return jsonify({'error': 'failed to parse CSV'}), 400

    group_cols = [c.strip() for c in group_by.split(',')] if group_by else None
    summary = compute_summary(df, group_cols=group_cols, time_col=time_col, top_n=top_n)

    # Plot
    plot_path = os.path.join(app.config['PLOT_FOLDER'], f"{uid}-plot.png")
    plot_summary(summary, plot_path)

    return jsonify({
        'upload_id': uid,
        'summary': summary,
        'plot_url': url_for('get_plot', uid=uid)
    })


@app.route('/plot/<uid>')
def get_plot(uid):
    # Serve the latest plot matching uid
    for fname in os.listdir(app.config['PLOT_FOLDER']):
        if fname.startswith(uid) and fname.endswith('.png'):
            return send_file(os.path.join(app.config['PLOT_FOLDER'], fname), mimetype='image/png')
    return jsonify({'error': 'plot not found'}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
