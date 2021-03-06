'use strict';

// Models
var Category = require('../models/Category.js');
var Notification = require('../models/Notification.js');
var PasswordResetToken = require('../models/PasswordResetToken.js');
var User = require('../models/User.js');
var VerificationToken = require('../models/VerificationToken.js');

// Modules
var utils = require('./utils.js');
var winston = require('winston');

// Handlers
var UserHandler = require('../handlers/user.js');

var transporter = require('../../config/mailer.js').transporterFactory();

// Routes that begin with /users
// ---------------------------------------------------------------------------
module.exports = function(router, isAuthenticated, acl, censor) {
  router.get('/users/leading/:datatype/:order',
    UserHandler.users.leading.get);
  router.get('/users/leading/experts/:datatype/:order/:category',
    UserHandler.users.leading.getByCategory.experts);
  router.get('/users/leading/investors/:datatype/:order/:category',
    UserHandler.users.leading.getByCategory.investors);
  router.get('/users/trending/experts/:order',
    UserHandler.users.trending.experts.getOverall);
  router.get('/users/trending/experts/:order/:category',
    UserHandler.users.trending.experts.getByCategory);
  router.get('/users/:category/trending/experts/:date',
    UserHandler.users.trending.experts.get);

  // Add an expert category to a given user
  function addExpertCategory(req, res, category) {
    var userId = req.params.user_id;
    User.findOneAndUpdate(
      {_id: userId, 'categories.name': {$ne: category.name}},
      {$push: {categories: { name: category.name, id: category._id } }},
      function(err, user) {
        if (err) {
          winston.log('error', 'Error finding user: %s', err);
          return res.status(501).send(err);
        } else if (!user) {
          return res.status(501).send('Already an expert');
        } else {
          // Add to the expert count
          category.experts += 1;
          category.save();

          // Create an event for the user becoming an expert
          utils.createEvent('addexpert', [user.username, user._id, category.name]);
          utils.updateRank(category.name, true, function(err) {
            if (err) {
              winston.log('error', 'Error updating expert rank: %s', err);
              return res.status(501).send(err);
            } else {
              User.findById(userId, function(err, user) {
                if (err) {
                  winston.log('error', 'Error finding user: %s', err);
                  return res.status(501).send(err);
                } else if (!user) {
                  return res.status(501).send(err);
                } else {
                  return res.status(200).send(user);
                }
              });
            }
          });
        }
      }

    );
  }

  router.get('/users/list/byids', UserHandler.users.listByIds.get);
  router.get('/users', UserHandler.users.get);
  router.get('/users/share', isAuthenticated, UserHandler.users.share.get);
  router.post('/verify', UserHandler.verify.post);

  router.route('/users')

    // Create a new user
    .post(censor.isNaughty, censor.hasSpamEmail, function(req, res) {

      if (!utils.validateCreateUserInputs(req)) {
        return res.status(412).send('Invalid inputs');
      }

      var user = new User({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        username: req.body.firstname + ' ' + req.body.lastname,
        password: req.body.password,
        email: req.body.email
      });
      user.save(function(err) {
        if (err) {
          var msg = '';
          // Mongoose validation errors are put in err.errors
          if (err.errors) {
            if (err.errors.password) {
              msg = err.errors.password.message;
            } else {
              msg = 'Fields cannot be blank';
            }

            winston.log('error', 'Error creating user: %s', msg);
            return res.status(501).send(msg);

          // If the error is not from Mongoose, try parsing MongoDB errors
          } else if (err.err.indexOf('email') !== -1) {
            msg = 'Email is already taken';
          } else {
            // Otherwise, send back generic 'Error' message
            msg = 'Error';
          }

          winston.log('error', 'Error creating user: %s', msg);
          return res.status(501).send(msg);
        } else {
          var verificationString = utils.getRandomString();

          var verificationToken = new VerificationToken({
            user: user.email,
            string: verificationString
          });

          verificationToken.save(function(err) {
            if (err) {
              winston.log('error', 'Error saving verification token: %s', err);
              return res.status(501).send('Unable to save new verificationToken');
            }

            var mailOptions = utils.getVerificationEmailOptions(
              user.email, verificationString, req.body.inviterId, req.body.hash);

            transporter.sendMail(mailOptions, function(err, info) {
              if (err) {
                winston.log('error', 'Error sending email: %s', err);
                return res.status(554).send('Error sending email');
              } else {
                winston.log('info', 'Sent email to: %s', user.email);
                return res.status(200).send('Sent email');
              }
            });
          });
        }
      });
    });

  router.get('/users/:user_id', UserHandler.users.userId.get);
  router.delete('/users/:user_id', isAuthenticated, acl.isAdminOrSelf, UserHandler.users.userId.delete);
  router.put('/users/:user_id', isAuthenticated, acl.isAdminOrSelf, UserHandler.users.userId.put);
  router.post('/users/:user_id/nudge/:user_id2', isAuthenticated, acl.isAdminOrSelf, UserHandler.users.userId.nudge.post);

  // Get experts for a given category. Set expert to '1' for expert category, '0' for investor
  router.get('/users/:categoryName/leaders', UserHandler.users.leaders.get);

  // Handle a requested category
  // Triggered by an administrator
  router.route('/users/:user_id/:category_name/:action/:expert')
    .post(acl.isAdmin, function(req, res) {
      var categoryName = req.params.category_name;
      var userId = req.params.user_id;
      var approved = req.params.action === 'approve' ? true : false;
      var expert = req.params.expert === '1' ? true : false;

      if (!approved) {
        // Create a denial notification
        var notification = new Notification({
          user    : { id: userId },
          message : 'We regret to inform you that the category \'' + categoryName + '\' was not approved.',
        });
        notification.save();
        return res.status(200).send('Denial succeeded');
      }

      var category = new Category({ name: categoryName });
      category.save(function(err, category) {
        if (err) {
          return res.status(501).send(err);
        }

        // Create an approval notification
        var notification = new Notification({
          user    : { id: userId },
          message : 'Congratulations! The category \'' + categoryName + '\' was approved!',
        });
        notification.save();

        // Create a notification that the category was created
        var user = User.findById(userId, function(err, user) {
          // On failure, simply skip creating the event
          if (err) {
            winston.log('error', 'Error creating new category event: %s', err.toString());
          } else {
            utils.createEvent('newcategory', [user.username, user._id, categoryName]);
          }
        });

        if (expert) {
          return addExpertCategory(req, res, category);
        }
        // TODO: make this statement execute by allowing category creation without becoming an expert
        return res.status(200).send('Category creation succeeded');
      });
    });

  // Add an expert category to a user if it is not already added
  // Request a new category if it does not exist
  router.route('/users/:user_id/addexpert/:category_name')
    .put(isAuthenticated, acl.isAdminOrSelf, censor.isNaughty, function(req, res) {
      var categoryName = req.params.category_name;
      var userId = req.params.user_id;

      Category.findByName(categoryName).then(function(category) {
        if (category) {
          return addExpertCategory(req, res, category);
        } else {
          // If the category does not exist, email the admin
          var mailOptions = utils.getCategoryRequestEmailOptions(categoryName, userId, 1);
          transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
              winston.log('error', 'Error sending email: %s', err);
              return res.status(503).send('An internal error occurred. Please try again.');
            } else {
              return res.status(200).end();
            }
          });
        }
      }, function(err) {
        winston.log('error', 'Error finding category: %s', err);
        return res.status(503).send(err);
      });
    });

  // Delete an expert category for a user
  router.put('/users/:user_id/:category_name/expert/delete', isAuthenticated, acl.isAdminOrSelf,
    UserHandler.users.userId.expertCategory.delete);

  // Reset a user's password by sending them an email with a reset link
  router.route('/users/sendPasswordResetEmail')
    .post(function(req, res) {
      var email = req.body.email;
      if (!email) {
        winston.log('error', 'No email provided in password reset request.');
        return res.status(412).send('No email address provided');
      }

      User.findOne({'email': email }, function(err, user) {
        if (err) {
          winston.log('error', 'Failed to send password reset email to user %s: %s.', email, err);
          return res.status(503).send('Error finding user for ' + email + '. Please try again.');
        } else if (!user) {
          return res.status(412).send('Unrecognized email address');
        } else if (user.facebookId) {
          return res.status(412).send('Users who sign up with facebook do not have a Repcoin email address');
        }

        var randomString = utils.getRandomString();
        var resetToken = new PasswordResetToken({
          user: user.email,
          string: randomString,
        });

        resetToken.save(function(err) {
          if (err) {
            winston.log('error', 'Failed to save password reset token for user %s: %s.', email, err);
            return res.status(501).send(err);
          }

          // Send an email with a link to reset the user's password
          var mailOptions = utils.getPasswordResetEmailOptions(
            user.email, randomString);

          transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
              winston.log('error', 'Failed to send email to user %s: %s', email, err);
              return res.status(554).send(err);
            } else {
              return res.status(200).end();
            }
          });
        });
      });
    });

  router.route('/users/newPassword')
    .post(function(req, res) {
      var token = req.body.token;
      var newPassword = req.body.password;

      if (!(token && newPassword)) {
        return res.status(412).send('No token provided');
      }

      // Remove the password reset token
      PasswordResetToken.findOneAndRemove({ 'string': token }, function(err, passwordResetToken) {
        if (err) {
          winston.log('error', 'Error finding password reset token: %s', err);
          return res.status(501).send(err);

        // Check if the password reset token was not found or it is has no user
        } else if (!(passwordResetToken && passwordResetToken.user)) {
          winston.log('error', 'Password reset token was not found for token: %s', token);
          return res.status(501).send('User verfication token not found in DB');
        } else {
          var email = passwordResetToken.user;
          User.findOne(
            {'email': email}, function(err,user) {
              if (err) {
                winston.log('error', 'Error updating %s\'s password: %s', email, err);
                return res.status(501).send(err);
              }

              user.password = newPassword;
              user.save(function(err) {
                if (err) {
                  winston.log('error', 'Unable to save user: %s', err);
                  return res.status(501).send(err);
                }

                req.login(user, function(err) {
                  if (err) {
                    winston.log('error', 'Error logging in user: %s', err);
                    return res.status(400).send(err);
                  } else {
                    return res.status(200).send(user);
                  }
                });
              });
            }
          );
        }
      });
    });
};
