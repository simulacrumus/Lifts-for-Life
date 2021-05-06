const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const adminAuth = require('../../middleware/admin.auth');
const Donation = require('../../models/donation.model');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Multer function to upload image
const upload = multer({
    storage: multer.diskStorage({
        destination: './client/src/imgs/uploads/donationss',
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

// @route   POST api/donations
// @desc    Send a donation request
// @access  Public
router.post('/',[
    check('email', 'Please provide a valid email address').isEmail(),
    check('firstName','First name cannot be empty').not().isEmpty(),
    check('lastName','Last name cannot be empty').not().isEmpty(),
    check('equipmentType','Equipment type  cannot be empty').not().isEmpty(),
    check('message','Message cannot be empty').not().isEmpty() 
],async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }
    const {
        email,
        firstName,
        lastName,
        equipmentType,
        message,
        latitude,
        longitude,
        ipAddress
    } = req.body

    try {

        const donation = new Donation({
            email,
            firstName,
            lastName,
            equipmentType,
            message,
            ipAddress,
            location: {
                latitude,
                longitude,
            }
        })

        await donation.save()

        res.json({
            msg: `Donation request sent!`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/donations/:id
// @desc    Delete a donation by id
// @access  Private
router.delete('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {

    try {

        const donation = await Donation.findOneAndDelete({
            _id: id
        })

        if(!donation){
            return res.status(400).json({
                errors: [{
                    msg: 'Donation does not exist'
                }]
            });
        }

        res.json({
            msg: `Donation deleted`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/donations
// @desc    Get all donations
// @access  Private
router.get('/', adminAuth, async (req, res) => {

    try {

        const donations = await Donation.find()

        res.json(donations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    GET api/donations/search/:key
// @desc     Get all donations matching with key
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
                    {message: { 
                        $regex: `.*${key}.*`
                    }},
                    {equipmentType: { 
                        $regex: `.*${key}.*`
                    }}
                ]
            }
        }

        const donations = await Donation.find(query)

        res.json(donations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    POST api/donations/pic/:id
// @desc     Upload or update equipment picture by equipment id
// @access   Private
router.post('/pic/:id', adminAuth, upload.single('image'), async (req, res) => {
    if (req.file == undefined) {
        return res.status(400).json({
            message: 'Please provide an image file with 2MB max size'
        });
    }
    try {

        const donation = await Donation.findById(req.params.id)

        if (!donation)
            return res.status(400).json({
                msg: 'Equipment not found'
            });

        if (fs.existsSync(`./client/src/imgs/uploads/donations/${donation.picture}`) && donation.picture !== 'default-pic.png') {
            fs.unlink(`./client/src/imgs/uploads/donations/${donation.picture}`, (err) => {
                if (err) throw err;
                console.log('Previous donation picture removed');
            });
        }

        await Donation.findOneAndUpdate({
            _id: req.params.id
        }, {
            picture: req.file.filename
        });

        donation.picture = req.file.filename

        res.json(donation);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;