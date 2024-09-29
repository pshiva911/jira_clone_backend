const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const { Readable } = require('stream'); 
const path = require('path');
const fs = require('fs')

require('dotenv').config()

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadFiletoS3 = async (file, fileExt) => {
    // Construct the path to the file to be uploaded
    const filePath = path.join("uploads", `s3uploading object${fileExt}`);
    
    // Create a read stream for the file
    const readStream = fs.createReadStream(filePath);
  
    // Define the S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: file.originalname, // Use the original file name for the key
      Body: readStream,
      ContentType: file.mimetype || 'application/octet-stream'  // Add content type based on file metadata
    };
  
    try {
      // Upload the file to S3
      const data = await s3Client.send(new PutObjectCommand(params));
      console.log('File uploaded successfully:', data);
      
      // Return a success message or data
      return { success: true, message: 'File uploaded successfully', data };
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      
      // Return an error message
      return { success: false, message: 'Failed to upload file', error: err };
    }
  };

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads');  // Set the upload destination
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + 'abcd-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);  // Get the file extension
      cb(null, "s3uploading-object"+fileExtension);  // Append the extension
    //   uploadFiletoS3(file,fileExtension)
    }
});
  
  // exports.upload = multer({storage: storage,
  //     onFileUploadStart: function (file) {
  //       console.log(file.originalname + ' is starting ...')
  //     },
  // });
const upload = multer({ storage: storage});

// exports.upload = multer({ dest: 'uploads',});

module.exports = {upload , s3Client}

