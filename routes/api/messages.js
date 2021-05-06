const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const adminAuth = require('../../middleware/admin.auth');
const Message = require('../../models/message.model');

// @route   POST api/messages
// @desc    Send a public message (contact us)
// @access  Public
router.post('/',[
    check('email', 'Please provide a valid email address').isEmail(),
    check('firstName','First name cannot be empty').not().isEmpty(),
    check('lastName','Last name cannot be empty').not().isEmpty(),
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
        message,
        latitude,
        longitude,
        ipAddress
    } = req.body

    try {

        const newMessage = new Message({
            email,
            firstName,
            lastName,
            message,
            location: {
                latitude,
                longitude,
            },
            ipAddress
        })

        await newMessage.save()

        res.json({
            msg: `Message sent!`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/messages:id
// @desc    Delete a message by id
// @access  Private
router.delete('/:id', adminAuth, async (req, res) => {

    try {
        const message = await Message.findOneAndDelete({
            _id: req.params.id
        })

        if(!message){
            return res.status(400).json({
                errors: [{
                    msg: 'Message does not exist'
                }]
            });
        }

        res.json({
            msg: `Message deleted`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/messages
// @desc    Get all messages
// @access  Private
router.get('/', adminAuth, async (req, res) => {

    try {

        const messages = await Message.find()

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    GET api/messages/search
// @desc     Get all messages matching with key
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
                    }}
                ]
            }
        }

        const messages = await Message.find(query)

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;