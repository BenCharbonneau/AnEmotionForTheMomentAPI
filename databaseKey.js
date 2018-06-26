//database key for firebase with private information extracted to the environment files
require('dotenv').config()

const keyJSON = {
  "type": "service_account",
  "project_id": "an-emotion-for-the-moment",
  "private_key_id": process.env.F_PRIVATE_KEY_ID,
  "private_key": "-----BEGIN PRIVATE KEY-----\n"+process.env.F_PRIVATE_KEY+"\n-----END PRIVATE KEY-----\n",
  "client_email": process.env.F_CLIENT_EMAIL,
  "client_id": process.env.F_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.F_CLIENT_CERT_URL
}

module.exports = keyJSON;