'use strict';

var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY
});

module.exports = function(router, isAuthenticated, acl) {
  router.route('/:user_id/upload')
    .post(isAuthenticated, acl.isAdminOrSelf, function(req, res) {
      cloudinary.uploader.upload(req.body.uri, function(result) {
        return res.send(result);
      });
    });

  router.route('/:user_id/remove/:public_id')
    .put(isAuthenticated, acl.isAdminOrSelf, function(req, res) {
      cloudinary.uploader.destroy(req.params.public_id, function(result) {
        return res.send(result);
      });
    });
};
