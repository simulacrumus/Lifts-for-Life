const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const adminAuth = require('../../middleware/admin.auth');
const config = require('config');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/admin.model');
const adminSecret = config.get('jwtAdminSecret')
const transporter = require('./../../config/email');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Multer function to upload image
const upload = multer({
    storage: multer.diskStorage({
        destination: './client/src/imgs/uploads/admins',
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

// @route   GET api/admins
// @desc    GET all admins
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
        const admins = await Admin.find()
        .populate({
            path: 'createdBy',
            select: ['name', 'email']
        })
        .select('-password');
        res.json(admins);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
    }
)


// @route   POST api/admins
// @desc    Register an admin
// @access  Private
router.post('/', adminAuth, [
    check('password', 'Password is required').not().isEmpty(),
    check('name', 'Name is required!').not().isEmpty(),
    check('email', 'Please provide a valid email address').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        name,
        email,
        password,
        phone
    } = req.body;

    try {
        // check if the admin already exists
        const admin = await Admin.findOne({
            email
        });

        if (admin) {
            return res.status(400).json({
                errors: [{
                    msg: 'Email already exists'
                }]
            });
        }

        //get admin id from request
        const createdBy = req.admin.admin.id
        
        // create a new admin object
        const newAdmin = new Admin({
            name,
            email,
            password,
            phone,
            createdBy
        });

        // encrypt password
        const salt = await bcrypt.genSalt(10);
        newAdmin.password = await bcrypt.hash(password, salt);

        // save new admin to database
        const savedAdmin = await newAdmin.save();

        const payload = {
            admin: {
                id: savedAdmin.id
            }
        }

        jwt.sign(payload, adminSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${savedAdmin.name}! Welcome to Lifts For Life</h3>
                <p>Click <a href="http://localhost:5000/api/admins/confirmation/${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts For Life <${config.get('emailAddress')}>`, // sender address
                to: `${savedAdmin.email}`, // list of receivers
                subject: "CONFIRM EMAIL - Lifts For Life", // Subject line
                text: "", // plain text body
                html: htmloutput, // html body
            });

            res.json({
                message: `Confirmation email sent, please check your inbox`
            })
        })

        

        // return message with successful operation
        res.json({
            msg: `Admin created. Please confirm email to login.`
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
});


// @route   PUT api/admins
// @desc    Update logged in admin
// @access  Private
router.put('/', adminAuth, [
    check('email', 'email is required').not().isEmpty(),
    check('name', 'Name is required!').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        name,
        email
    } = req.body;

    try {
        // check if the admin already exists
        const admin = await Admin.findOneAndUpdate({
            _id: req.admin.admin.id
        },{
            name,
            email
        })
        .populate({
            path: 'createdBy',
            select: ['name', 'email']
        })
        .select('-password');

        if (!admin) {
            return res.status(400).json({
                errors: [{
                    msg: 'There is no admin'
                }]
            });
        }

        // return message with successful operation
        res.json({
            msg: `Admin information updated`,
            admin
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
});

// @route   GET api/admins/me
// @desc    Get admin profile for logged in admin
// @access  Private
router.get('/me', adminAuth, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.admin.id)
        .select('-password');

        if (!admin) {
            return res.status(400).json({
                msg: 'There is no admin profile with this id'
            });
        }

        res.json(admin)
    } catch (err) {
        console.error(err.message);
        res.status(500).send({
            msg: 'Server error!'
        });
    }
});

// @route   DELETE api/admins/me
// @desc    Delete admin profile for logged in admin
// @access  Private
router.delete('/me', adminAuth, async (req, res) => {
    try {
        const admin = await Admin.findOneAndRemove({
            _id: req.admin.admin.id
        })

        if (!admin) {
            return res.status(400).json({
                msg: 'There is no admin profile with this id'
            });
        }

        res.status(200).send('You have deleted your admin profile');
    } catch (err) {
        console.error(err.message);
        res.status(500).send({
            msg: 'Server error!'
        });
    }
});

// @route    DELETE api/admins/:id
// @desc     Delete an admin by ID
// @access   Private
router.delete('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {
    try {
        const admin = await Admin.findOneAndRemove({
            _id: id
        })

        if (!admin)
            return res.status(400).json({
                msg: 'Admin not found'
            });

            res.status(200).send('Admin removed');
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});


// @route    GET api/admins/:id
// @desc     Get an admin by ID
// @access   Private
router.get('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {
    try {
        const admin = await Admin.findById(id)
        .populate({
            path: 'createdBy',
            select: ['name', 'email']
        })
        .select('-password');

        if (!admin)
            return res.status(400).json({
                msg: 'Admin not found'
            });

        return res.json(admin);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});

// @route   GET api/admin/confirmation/:token
// @desc    Confirm admin email
// @access  Public
router.get('/confirmation/:token', async ({
    params: {
        token
    }
}, res) => {
    try {
        const decoded = jwt.verify(token, adminSecret);

        const admin = await Admin.findOneAndUpdate({
            _id: decoded.admin.id
        }, {
            emailConfirmed: true
        });

        if (!admin) {
            return res.status(400).json({
                message: 'Admin not found!'
            });
        }

        res.status(200).send('Email confirmed. Please login');
    } catch (err) {
        res.status(401).json({
            msg: 'Token is not valid!'
        });
    }
});


// @route   POST api/admin/forgetpswd
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
    const admin = await Admin.findOne({
        email
    })

    if (!admin) {
        return res.status(400).json({
            message: "There's no admin with given email"
        })
    }

    const payload = {
        admin: {
            id: admin.id
        }
    }

    jwt.sign(payload, adminSecret, {
        expiresIn: '1d'
    }, (err, token) => {
        if (err) throw err;
        console.log('token', token);
        // create html 
        const htmloutput = `<h3>Hi, ${admin.name}!</h3>
        <p>Click <a href="http://localhost:3000/admin/changepassword?token=${token}">here</a> to reset your password!</p>`

        // send mail with defined transport object
        transporter.sendMail({
            from: config.get('emailAddress'), // sender address
            to: `${email}`, // list of receivers
            subject: "RESET PASSWORD - Lifts for Life", // Subject line
            text: "", // plain text body
            html: htmloutput // html body
        });

        res.json({
            message: `Please check your email to reset your password`
        })
    })
});

// @route   PUT api/admin/password
// @desc    Change password when admin forgets password, takes a passwprd and token and changes the password for the logged in admin
// @access  Private
router.put('/password', adminAuth, [
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

        const admin = await Admin.findOneAndUpdate({
            _id: req.admin.admin.id
        }, {
            password: encryptedPassword
        })

        if (!admin) {
            return res.status(400).json({
                message: "Admin not found"
            })
        }

        res.json({
            message: 'Pasword updated'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error!');
    }

});

// @route   POST api/auth/admin/changeemail
// @desc    Change email for the logged in admin
// @access  Private
router.post('/changeemail', adminAuth, [
    check('email', 'Invalid email address').isEmail()
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
        const admin = await Admin.findById(req.admin.admin.id)

        if(!admin){
            return res.status(400).json({
                message: "Admin not found"
            })
        }

        await Admin.findOneAndUpdate({
            _id: req.admin.admin.id
        }, {
            email,
            emailConfirmed: false
        })

        const payload = {
            admin: {
                id: admin.id
            }
        }

        jwt.sign(payload, adminSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${admin.name}! You have decided to change your email</h3>
                <p>Click <a href="http://localhost:3000/admin/confirmation?token=${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts for Life <${config.get('emailAddress')}`, // sender address
                to: `${email}`, // list of receivers
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

// @route   POST api/admins/resendconfirmation
// @desc    Resend confirmation email for admin
// @access  Private
router.put('/resendconfirmation', adminAuth, async (req, res) => {
    try {
        const admin = await Admin.findOne({
            _id: req.admin.admin.id    
        })

        if (admin.emailConfirmed) {
            return res.status(400).json({
                message: 'Email already confirmed'
            })
        }

        const payload = {
            admin: {
                id: admin.id
            }
        }

        jwt.sign(payload, adminSecret, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) throw err;

            // create html 
            const htmloutput = `<h3>Hi, ${admin.name}! Welcome to Lifts For Life</h3>
                <p>Click <a href="http://localhost:5000/api/admin/confirmation/${token}" target="_blank" >here</a> to confirm your email!</p>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts for Life <${config.get('emailAddress')}`, // sender address
                to: `${admin.email}`, // list of receivers
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

// @route    POST api/admins/pic
// @desc     Upload or update profile picture of the admin
// @access   Private
router.post('/pic', adminAuth, upload.single('image'), async (req, res) => {
    if (req.file == undefined) {
        return res.status(400).json({
            message: 'Please provide an image file with 2MB max size'
        });
    }
    try {

        const admin = await Admin.findById(req.admin.admin.id)

        if (fs.existsSync(`./client/src/imgs/uploads/admins/${admin.profilePic}`) && admin.profilePic !== 'default-profile-pic.png') {
            fs.unlink(`./client/src/imgs/uploads/admins/${admin.profilePic}`, (err) => {
                if (err) throw err;
                console.log('Previous profile picture removed');
            });
        }

        await Admin.findOneAndUpdate({
            _id: req.admin.admin.id
        }, {
            profilePic: req.file.filename
        });

        admin.profilePic = req.file.filename

        res.json(admin);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    GET api/admins/search/:key
// @desc     Get all admins matching with search key
// @access   Private
router.get('/search/:key', adminAuth, async (req, res) => {

    let key = req.params.key

    let query = {};

    try {

        if (key) {
            query = {
                $or: [
                    {name: { 
                        $regex: `.*${key}.*`
                    }},
                    {email: { 
                        $regex: `.*${key}.*`
                    }},
                    {phone: { 
                        $regex: `.*${key}.*`
                    }}
                ]
            }
        }

        const admins = await Admin.find(query)
            .populate({
                path: 'createdBy',
                select: ['name', 'email']
            })
            .select('-password');

        res.json(admins);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;