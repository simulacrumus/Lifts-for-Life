const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/admin.auth');
const clientAuth = require('../../middleware/client.auth');
const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/admin.model');
const Client = require('../../models/client.model');
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const clientSecret = config.get('jwtClientSecret')
const adminSecret = config.get('jwtAdminSecret')
const transporter = require('./../../config/email');

// @route   GET api/auth/admin
// @desc    Get Admin info
// @access  Private
router.get('/admin', adminAuth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.admin.id).select('-password');
        res.json(admin);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth
// @desc    Get Client info
// @access  Private
router.get('/client', adminAuth || clientAuth, async (req, res) => {
    try {
        const client = await Client.findById(req.client.id).select('-password');
        res.json(client);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    POST api/auth/client
// @desc     Authenticate admin and get token
// @access   Public
router.post(
    '/admin',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // get email and password values from request body
        const {
            email,
            password
        } = req.body;

        try {
            // check if there is an admin with the given email
            const admin = await Admin.findOne({
                email
            });

            // if no admin with the given email, return error
            if (!admin) {
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Invalid Credentials'
                        }]
                    });
            }

            // check if the given password matches with the password in db
            const isMatch = await bcrypt.compare(password, admin.password);

            // if the password does not match, return error
            if (!isMatch) {
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Invalid Credentials'
                        }]
                    });
            }

            // check if email was confirmed
            if(!admin.emailConfirmed){
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Please confirm your email to login'
                        }]
                    });
            }

            // if login successful, add admin id to paylod
            const payload = {
                admin: {
                    id: admin.id
                }
            };

            // create a token with an expiry of one day, add payload to token
            jwt.sign(
                payload,
                adminSecret, {
                expiresIn: '1d'
            }, (err, token) => {
                    if (err) throw err;
                    // return token
                    res.json({
                        token,
                        id: admin.id,
                    });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

// @route    POST api/auth/client
// @desc     Authenticate client and get token
// @access   Public
router.post(
    '/client',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        // get email and password values from request body
        const {
            email,
            password
        } = req.body;

        try {

            // check if there is an client with the given email
            const client = await Client.findOne({
                email
            });

            // if no client with the given email, return error
            if (!client) {
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Invalid Credentials'
                        }]
                    });
            }

            // check if the given password matches with the password in db
            const isMatch = await bcrypt.compare(password, client.password);

            // if the password does not match, return error
            if (!isMatch) {
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Invalid Credentials'
                        }]
                    });
            }

            // check if email was confirmed
            if(!client.emailConfirmed){
                return res
                    .status(400)
                    .json({
                        errors: [{
                            message: 'Please confirm your email to login'
                        }]
                    });
            }

            // if login successful, add client id to paylod
            const payload = {
                client: {
                    id: client.id
                }
            };

            // create a token with an expiry of one day, add payload to token
            jwt.sign(
                payload,
                clientSecret, {
                expiresIn: '1d'
            }, (err, token) => {
                    if (err) throw err;

                    // return token
                    res.json({
                        token,
                        id: client.id
                    });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;