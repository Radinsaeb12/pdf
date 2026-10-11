from flask import Flask, request, send_file
from flask_cors import CORS
from pypdf import PdfReader, PdfWriter
import os

# Flask'a şablon veya statik klasörü aramadan, doğrudan ana dizini kullan diyoruz
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = '/tmp/temp'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Ana sayfaya (/) girildiğinde doğrudan yanındaki index.html'i okuyup tarayıcıya basar
@app.route('/')
def index():
    if os.path.exists('index.html'):
        with open('index.html', 'r', encoding='utf-8') as f:
            return f.read()
    return "index.html bulunamadı!", 404

# JavaScript ve CSS dosyalarını doğrudan ana dizinden çağırabilmesi için rota
@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(filename):
        return send_file(filename)
    return "Dosya bulunamadı", 404

@app.route('/encrypt', methods=['POST'])
def encrypt_pdf():
    if 'file' not in request.files:
        return "Dosya bulunamadı", 400
    
    file = request.files['file']
    password = request.form.get('password')
    
    if not password:
        return "Şifre gerekli", 400
        
    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    output_path = os.path.join(UPLOAD_FOLDER, f"sifreli_{file.filename}")
    
    file.save(input_path)
    
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for page in reader.pages:
            writer.add_page(page)
            
        writer.encrypt(password)
        
        with open(output_path, "wb") as f:
            writer.write(f)
            
        return send_file(output_path, as_attachment=True, download_name=f"nova-sifreli-{file.filename}")
    except Exception as e:
        return str(e), 500
    finally:
        if os.path.exists(input_path): os.remove(input_path)
