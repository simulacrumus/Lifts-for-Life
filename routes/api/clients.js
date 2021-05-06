const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const passwordValidator = require('../../middleware/pwd.validator');
const clientAuth = require('../../middleware/client.auth');
const adminAuth = require('../../middleware/admin.auth');
const config = require('config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../../models/client.model');
const clientSecret = config.get('jwtClientSecret')
const transporter = require('./../../config/email');
const Admin = require('../../models/admin.model');

// Multer function to upload image
const upload = multer({
    storage: multer.diskStorage({
        destination: './client/src/imgs/uploads/clients',
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 2 // 2MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Images Only! Only files with jpeg, jpg, png and gif extension accepted');
        }
    }
});

// @route   GET api/clients
// @desc    Get all clients
// @access  Private
router.get('/', adminAuth,
    async(req, res) => {
        const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    try {
        const clients = await Client.find()
        .populate({
            path: 'createdBy',
            select: ['name', 'email', 'phone']
        })
        .populate({
            path: 'orders',
            populate: {
                path: 'equipmentId',
                select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
            }
        })
        .select(['-password', '-emailConfirmed'])
        
        res.json(
            clients
        );
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error!');
    }
    }
)

// @route   GET api/clients/me
// @desc    Get client profile for logged in client
// @access  Private
router.get('/me', clientAuth, async (req, res) => {
    try {
        const client = await Client.findOne({
            _id: req.client.client.id
        })
        .populate({
            path: 'createdBy',
            select: ['name', 'email', 'phone']
        })
        .populate({
            path: 'orders',
            populate: {
                path: 'equipmentId',
                select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
            }
        })
        .select(['-password', '-emailConfirmed'])

        if (!client) {
            return res.status(400).json({
                msg: 'There is no client profile with this id'
            });
        }

        res.json(client);

    } catch (err) {
        console.error(err.message);
        res.status(500).send({
            msg: 'Server error!'
        });
    }
});

// @route    GET api/clients/:id
// @desc     Get a client by ID
// @access   Private
router.get('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {
    try {
        const client = await Client.findById({
            _id: id
        })
        .select('-password')
        .populate({
            path: 'createdBy',
            select: ['name', 'email', 'phone']
        })
        .populate({
            path: 'orders',
            populate: {
                path: 'equipmentId',
                select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
            }
        });

        if (!client)
            return res.status(400).json({
                msg: 'Client not found'
            });

        return res.json(client);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});

// @route   POST api/clients
// @desc    Register client
// @access  Private
router.post('/', adminAuth, [
    check('password', 'Password should be min 6 and max 30 characters long').not().isEmpty().isLength({min: 6, max: 30}),
    check('firstName', 'First name is required!').not().isEmpty(),
    check('lastName', 'Last name is required!').not().isEmpty(),
    check('email', 'Please provide a valid email').isEmail(),
    check('address', 'Please provide a valid address').not().isEmpty(),
    check('phoneNumber', 'Please provide a phone number').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        firstName,
        lastName,
        email,
        password,
        address,
        newsletter,
        phoneNumber,
        note
    } = req.body;

    try {
        // check if the  client already exists
        const client = await Client.findOne({
            email
        });

        if (client) {
            return res.status(400).json({
                errors: [{
                    msg: 'Email already exists'
                }]
            });
        }

        const admin = await Admin.findById(req.admin.admin.id)

        // create a new client object
        const newClient = new Client({
            createdBy: admin.id,
            firstName,
            lastName,
            email,
            address,
            newsletter,
            phoneNumber,
            note
        });

        // encrypt password
        const salt = await bcrypt.genSalt(10);

        newClient.password = await bcrypt.hash(password, salt);

        // save new client to database
        const saveClient = await newClient.save();

        const payload = {
            client: {
                id: saveClient.id
            }
        }

        jwt.sign(payload, clientSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${saveClient.name}! Welcome to Lifts For Life</h3>
                <p>Click <a href="http://localhost:5000/api/clients/confirmation/${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts For Life <${config.get('emailAddress')}>`, // sender address
                to: `${saveClient.email}`, // list of receivers
                subject: "CONFIRM EMAIL - Lifts For Life", // Subject line
                text: "", // plain text body
                html: htmloutput, // html body
            });

                    // return message with successful operation
            res.json({
                message: `Client created and confirmation email sent to ${saveClient.email}`
            })
        })

    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error!');
    }
});

// @route    DELETE api/clients/:id
// @desc     Delete a client by ID
// @access   Private
router.delete('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {
    try {
        const client = await Client.findOneAndRemove({
            _id: id
        })

        if (!client){
            return res.status(400).json({
                msg: 'Client not found'
            });
        }

        // TODO Need to remove client's orders

        res.status(200).send('Client removed');

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});


// @route   PUT api/client
// @desc    Update logged in client
// @access  Private
router.put('/', clientAuth, [
    check('firstName', 'First name is required!').not().isEmpty(),
    check('lastName', 'Last name is required!').not().isEmpty(),
    check('address', 'Please provide a valid address').not().isEmpty(),
    check('phoneNumber', 'Please provide a phone number').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        firstName,
        lastName,
        address,
        phoneNumber,
        newsletter
    } = req.body;

    try {
        // check if the admin already exists
        const client = await Client.findOneAndUpdate({
            _id: req.client.client.id
        },{
            firstName,
            lastName,
            address,
            phoneNumber,
            newsletter
        })
        .populate({
            path: 'createdBy',
            select: ['name', 'email', 'phone']
        })
        .populate({
            path: 'orders',
            populate: {
                path: 'equipmentId',
                select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
            }
        })
        .select(['-password', '-emailConfirmed']);

        if (!client) {
            return res.status(400).json({
                errors: [{
                    msg: 'There is no client with this ID'
                }]
            });
        }

        // return message with successful operation
        res.json({
            msg: `Client information updated`,
            client
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
});

// @route   GET api/client/confirmation/:token
// @desc    Confirm client email
// @access  Public
router.get('/confirmation/:token', async ({
    params: {
        token
    }
}, res) => {
    try {
        const decoded = jwt.verify(token, clientSecret);

        const client = await Client.findByIdAndUpdate({
            _id: decoded.client.id
        }, {
            emailConfirmed: true
        });

        if (!client) {
            return res.status(400).json({
                message: 'Client not found!'
            });
        }

        res.status(200).send('Email confirmed. Please login');
    } catch (err) {
        res.status(401).json({
            msg: 'Token is not valid!'
        });
    }
});


// @route   PUT api/clients
// @desc    Update client by client id
// @access  Private
router.put('/:id', adminAuth, [
    check('firstName', 'First name is required!').not().isEmpty(),
    check('lastName', 'Last name is required!').not().isEmpty(),
    check('address', 'Please provide a valid address').not().isEmpty(),
    check('phoneNumber', 'Please provide a phone number').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        firstName,
        lastName,
        address,
        phoneNumber,
        newsletter
    } = req.body;

    try {
        // check if the admin already exists
        const client = await Client.findOneAndUpdate({
            _id: req.params.id
        },{
            firstName,
            lastName,
            address,
            phoneNumber,
            newsletter
        })
        .populate({
            path: 'createdBy',
            select: ['name', 'email', 'phone']
        })
        .populate({
            path: 'orders',
            populate: {
                path: 'equipmentId',
                select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
            }
        })
        .select(['-password', '-emailConfirmed']);

        if (!client) {
            return res.status(400).json({
                errors: [{
                    msg: 'There is no client with given ID'
                }]
            });
        }

        // return message with successful operation
        res.json({
            msg: `Client information updated`,
            client
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
});

// @route   POST api/client/forgetpswd
// @desc    Forget password route, takes an email and sends a link to that email if exists
// @access  Public
router.post('/forgetpswd', [
    check('email', 'Email address not valid').isEmail()
], async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const {
        email
    } = req.body;

    const client = await Client.findOne({
        email
    })

    if (!client) {
        return res.status(400).json({
            message: "There's no client with given email"
        })
    }

    const payload = {
        client: {
            id: client.id
        }
    }

    jwt.sign(payload, clientSecret, {
        expiresIn: '1d'
    }, (err, token) => {
        if (err) throw err;

        const clientName = client.name || 'customer'
        // create html 
        const htmloutput = `<h3>Dear, ${clientName}!</h3>
        <p>Click <a href="http://localhost:3000/client/changepassword?token=${token}">here</a> to reset your password!</p>`

        // send mail with defined transport object
        transporter.sendMail({
            from: config.get('emailAddress'), // sender address
            to: `${email}`, // list of receivers
            subject: "RESET PASSWORD - Lifts for Life", // Subject line
            text: "", // plain text body
            html: htmloutput // html body
        });

        res.json({
            message: `Please check your email`
        })
    })
});

// @route   POST api/client/password
// @desc    Change password when client forgets password, takes a passwprd and token and changes the password for the logged in client
// @access  Private
router.post('/password', clientAuth, [
    check('password', 'Password cannot be empty').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const {
        password
    } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);

        const encryptedPassword = await bcrypt.hash(password, salt);

        const client = await Client.findOneAndUpdate({
            _id: req.client.client.id
        }, {
            password: encryptedPassword
        })

        if (!client) {
            return res.status(400).json({
                message: "Client not found"
            })
        }

        res.json({
            message: 'Pasword updated',
            client
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error!');
    }

});

// @route   POST api/auth/client/changeemail
// @desc    Change email
// @access  Private
router.post('/changeemail', clientAuth, [
    check('email', 'Invalid email address').isEmail(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const {
        email
    } = req.body;

    try {
        const client = await Client.findById(req.client.client.id)

        if(!client){
            return res.status(400).json({
                message: "Client not found"
            })
        }

        await Client.findOneAndUpdate({
            _id: req.client.client.id
        }, {
            email,
            emailConfirmed: false
        })

        const payload = {
            client: {
                id: client.id
            }
        }

        jwt.sign(payload, clientSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${client.name}! You have decided to change your email</h3>
                <p>Click <a href="http://localhost:3000/client/confirmation?token=${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts for Life <${config.get('emailAddress')}`, // sender address
                to: `${client.email}`, // list of receivers
                subject: "CONFIRM EMAIL - Lifts for Life", // Subject line
                text: "", // plain text body
                html: htmloutput, // html body
            });

            res.json({
                message: `Email updated, please check your inbox`
            })
        })

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error!');
    }
});

// @route   POST api/auth/client/resendconfirmation
// @desc    Resend confirmation email for client
// @access  Private
router.post('/resendconfirmation', clientAuth, async (req, res) => {
    try {

        const client = await Client.findById(req.client.client.id)

        if (client.emailConfirmed) {
            return res.status(400).json({
                message: 'Email already confirmed'
            })
        }

        const payload = {
            client: {
                id: client.id
            }
        }

        jwt.sign(payload, clientSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${client.name}! Welcome to Lifts For Life</h3>
                <p>Click <a href="http://localhost:5000/api/client/confirmation/${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts For Life <${config.get('emailAddress')}>`, // sender address
                to: `${client.email}`, // list of receivers
                subject: "CONFIRM EMAIL - Lifts For Life", // Subject line
                text: "", // plain text body
                html: htmloutput, // html body
            });

            res.json({
                message: `Confirmation email sent, please check your inbox`
            })
        })

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error!');
    }
});

// @route    POST api/clients/pic
// @desc     Upload or update profile picture of the client
// @access   Private
router.post('/pic', clientAuth, upload.single('image'), async (req, res) => {
    if (req.file == undefined) {
        return res.status(400).json({
            message: 'Please provide an image file with 2MB max size'
        });
    }
    try {

        const client = await Client.findById(req.client.client.id)

        if (fs.existsSync(`./client/src/imgs/uploads/clients/${client.profilePic}`) && client.profilePic !== 'default-profile-pic.png') {
            fs.unlink(`./client/src/imgs/uploads/clients/${client.profilePic}`, (err) => {
                if (err) throw err;
                console.log('Previous profile picture removed');
            });
        }

        await Client.findOneAndUpdate({
            _id: req.client.client.id
        }, {
            profilePic: req.file.filename
        });

        client.profilePic = req.file.filename

        res.json(client);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    GET api/clients/search/:key
// @desc     Get all clients matching with search key
// @access   Private
router.get('/search/:key', adminAuth, async (req, res) => {

    let key = req.params.key

    let query = {};

    try {

        if (key) {
            query = {
                $or: [
                    {firstName: { 
                        $regex: `.*${key}.*`
                    }},
                    {lastName: { 
                        $regex: `.*${key}.*`
                    }},
                    {email: { 
                        $regex: `.*${key}.*`
                    }},
                    {address: { 
                        $regex: `.*${key}.*`
                    }},
                    {phoneNumber: { 
                        $regex: `.*${key}.*`
                    }}
                ]
            }
        }

        const clients = await Client.find(query)
            .populate({
                path: 'createdBy',
                select: ['name', 'email', 'phone']
            })
            .populate({
                path: 'orders',
                populate: {
                    path: 'equipmentId',
                    select: ['type', 'name', 'serialId', 'sellPrice', 'rentPrice']
                }
            })
            .select(['-password', '-emailConfirmed']);

        res.json(clients);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
