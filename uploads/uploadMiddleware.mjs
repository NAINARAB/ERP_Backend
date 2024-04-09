import multer from 'multer';
import fs from 'fs'
import path from 'path';


const uploadFile = (req, res, uploadLocation, key) => {
    const folders = ['./products', './retailers'];
    const uploadDir = path.join(__dirname, folders[Number(uploadLocation)]);

    const ensureUploadDirExists = (dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    };

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            ensureUploadDirExists(uploadDir);
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const fileName = new Date().toISOString().replace(/:/g, '-') + "_" + file.originalname;
            cb(null, fileName);
        },
    });

    const upload = multer({ storage: storage }).single(key);

    return new Promise((resolve, reject) => {
        upload(req, res, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
} 

export default uploadFile;