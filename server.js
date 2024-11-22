// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB limit
    }
});

// Store file metadata in memory (use a database in production)
const fileDatabase = new Map();

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        const file = req.file;
        const fileId = path.basename(file.filename, path.extname(file.filename));
        
        const fileInfo = {
            id: fileId,
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            uploadDate: new Date(),
            path: file.path
        };
        
        fileDatabase.set(fileId, fileInfo);
        
        res.json({
            success: true,
            fileId: fileId,
            fileInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get file info endpoint
app.get('/files', (req, res) => {
    const files = Array.from(fileDatabase.values());
    res.json(files);
});

// Download endpoint
app.get('/file/:fileId', (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileInfo = fileDatabase.get(fileId);
        
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        res.download(fileInfo.path, fileInfo.originalName);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete endpoint
app.delete('/file/:fileId', (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileInfo = fileDatabase.get(fileId);
        
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Delete file from disk
        fs.unlinkSync(fileInfo.path);
        // Remove from database
        fileDatabase.delete(fileId);
        
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});