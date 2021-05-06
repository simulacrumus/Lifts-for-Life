const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const adminAuth = require('../../middleware/admin.auth');
const clientAuth = require('../../middleware/client.auth');
const config = require('config');
const bcrypt = require('bcryptjs');
const Equipment = require('../../models/equipment.model');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Multer function to upload image
const upload = multer({
    storage: multer.diskStorage({
        destination: './client/src/imgs/uploads/equipments',
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

// @route   POST api/equipment
// @desc    Register equipment
// @access  Private
router.get('/', adminAuth, async(req,res) => {
    try {
        const equipments = await Equipment.find();

        res.json(
            equipments
        )
    } catch (error) {
        if(error){
            res.status(500).send('Server error!')
        }
    }
})

// @route   POST api/equipment
// @desc    Register equipment
// @access  Private
router.post('/', adminAuth, [
    check('name', 'Name is required!').not().isEmpty(),
    check('serialId', 'Please provide a valid serial Id').isNumeric(), 
    check('type', 'Type is required!').not().isEmpty(),
    check('serialId', 'Serial Id is required!').not().isEmpty(),
    check('sellPrice', 'Sell Price is required!').not().isEmpty(),
    check('rentPrice', 'Rent Price is required!').not().isEmpty(),
    
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const createdBy = req.admin.admin.id;

    const {
        name,
        type,
        serialId,
        sellPrice,
        rentPrice, 
        date
    } = req.body;

    try {
        // check if the serial Id already exists
        let equipment = await Equipment.findOne({
            serialId
        });

        if (equipment) {
            return res.status(400).json({
                errors: [{
                    msg: 'Serial Id already exists'
                }]
            });
        }

        const newEquipment = new Equipment({
            name,
            type,
            serialId,
            sellPrice,
            rentPrice, 
            date,
            createdBy 
        })

        await newEquipment.save()

        res.json({
            msg: "Equipment saved!"
        })
    }
    catch (err) {
            console.log(err.message);
            res.status(500).send('Server error!');
        }
});

// @route   GET api/equipment
// @desc    Get equipment by id
// @access  Private
router.get('/:id', adminAuth,  async ({
    params: {
        id
    }
}, res) => {
    try {
        const equipment = await Equipment.findById({
            _id: id
        })

        if (!equipment)
            return res.status(400).json({
                msg: 'Equipment not found'
            });

        return res.json(equipment);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});

// @route   GET api/equipment
// @desc    Delete equipment by id
// @access  Private
router.delete('/:id', adminAuth, async ({
    params: {
        id
    }
}, res) => {
    try {
        const equipment = await Equipment.findByIdAndDelete(id)

        if (!equipment)
            return res.status(400).json({
                msg: 'Equipment not found'
            });

        return res.json({
            msg: 'Equipment deleted successfully'
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});

// @route   GET api/equipment
// @desc    Get All Equipments
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
        const equipments = await Equipment.find();
        res.json({
            equipments
        });
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server error!');
    }
    }
)

// @route   GET api/equipment
// @desc    update an equipment by id
// @access  Private
router.put('/update/:id', adminAuth, [
    check('name', 'Name is required!').not().isEmpty(),
    check('type', 'Type is required!').not().isEmpty(),
    check('sellPrice', 'Sell Price is required!').isNumeric(),
    check('rentPrice', 'Rent Price is required!').isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {
        name,
        type,
        sellPrice,
        rentPrice
    } = req.body;

    try {

        const equipment = await Equipment.findById(req.params.id);

        if (!equipment)
            return res.status(400).json({
                msg: 'Equipment not found'
            });

        await Equipment.findOneAndUpdate(({
            _id: req.params.id
        },{
            name,
            type,
            sellPrice,
            rentPrice
        }));
        
        res.json({
            msg: `Equipment information updated`
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error!');
    }
});

// @route    POST api/equipments/pic/:id
// @desc     Upload or update equipment picture by equipment id
// @access   Private
router.post('/pic/:id', adminAuth, upload.single('image'), async (req, res) => {
    if (req.file == undefined) {
        return res.status(400).json({
            message: 'Please provide an image file with 2MB max size'
        });
    }
    try {

        const equipment = await Equipment.findById(req.params.id)

        if (!equipment)
            return res.status(400).json({
                msg: 'Equipment not found'
            });

        if (fs.existsSync(`./client/src/imgs/uploads/equipments/${equipment.picture}`) && equipment.picture !== 'default-pic.png') {
            fs.unlink(`./client/src/imgs/uploads/equipments/${equipment.picture}`, (err) => {
                if (err) throw err;
                console.log('Previous equipment picture removed');
            });
        }

        await Equipment.findOneAndUpdate({
            _id: req.params.id
        }, {
            picture: req.file.filename
        });

        equipment.picture = req.file.filename

        res.json(equipment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    GET api/equipments/search/:key
// @desc     Get all equipments matching with key
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
                    {type: { 
                        $regex: `.*${key}.*`
                    }}
                ]
            }
        }

        const equipments = await Equipment.find(query)
            .populate({
                path: 'createdBy',
                select: ['name', 'email']
            })

        res.json(equipments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;