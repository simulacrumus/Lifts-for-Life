const express = require('express');
const router = express.Router();
const {
    check,
    checkSchema,
    validationResult
} = require('express-validator');
const adminAuth = require('../../middleware/admin.auth');
const clientAuth = require('../../middleware/admin.auth');
const config = require('config');
const bcrypt = require('bcryptjs');
const Newsletter = require('../../models/newsletter.model');
const mailchimpListId = config.get('mailchimpListID')
const mailchimp = require("@mailchimp/mailchimp_marketing");
const API = config.get('mailchimpAPI');
const SERVER = config.get('mailchimpServer');

// @route   POST api/newsletters
// @desc    Subscribe to the newsletters
// @access  Public
router.post('/',[
    check('email', 'Please provide a valid email address').isEmail(),
    check('firstName','First name cannot be empty').not().isEmpty(),
    check('lastName','Last name cannot be empty').not().isEmpty()
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
        latitude,
        longitude,
        ipAddress
    } = req.body
    
    try {

        newsletter = await Newsletter.findOne({
            email: email
        })

        if(newsletter){
            return res.status(400).json({
                errors: [{
                    msg: 'Email already subscribed'
                }]
            });
        }
        
        newsletter = new Newsletter({
            email,
            firstName,
            lastName,
            location:{
                latitude,
                longitude
            },
            ipAddress
        })

        await newsletter.save();

        // Subscribe user in mailchimp as well
        mailchimp.setConfig({
            apiKey: API,
            server: SERVER,
        });

        // const response = await mailchimp.lists.addListMember(mailchimpListId, {
        //     email_address: email,
        //     status: "subscribed",
        //     merge_fields: {
        //         FNAME: firstName,
        //         LNAME: lastName
        //     }
        // });

        let response = {}
        try {
            response = await mailchimp.lists.getListMember(
                mailchimpListId,
                email
            );
        } catch (error) {
            await mailchimp.lists.addListMember(mailchimpListId, {
                email_address: email,
                status: "subscribed",
                merge_fields: {
                    FNAME: firstName,
                    LNAME: lastName
                }
            });
            response.status = 'not subscribed'
        }

        if(response.status === 'archived' || response.status === 'cleaned'){
            await mailchimp.lists.addListMember(mailchimpListId, {
                email_address: email,
                status: "subscribed",
                merge_fields: {
                    FNAME: firstName,
                    LNAME: lastName
                }
            });
        } else if (response.status == 'unsubscribed'){
            await mailchimp.lists.updateListMember(
                mailchimpListId,
                email,
                {
                  status: "subscribed"
                }
              );
        }

        res.json({
            msg: `Email added to newsletter list`
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/newsletters
// @desc    Unubscribe from the newsletters
// @access  Public
router.delete('/',[
    check('email', 'Please provide a valid email address').isEmail()
],async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const {email} = req.body

    try {

        const newsletter = await Newsletter.findOneAndDelete({
            email: email
        })

        if(!newsletter){
            return res.status(400).json({
                errors: [{
                    msg: 'Email not subscribed'
                }]
            });
        }

        // Unsubscribe user in mailchimp as well
        mailchimp.setConfig({
            apiKey: API,
            server: SERVER,
        });

        let response = {}
        try {
            response = await mailchimp.lists.getListMember(
                mailchimpListId,
                email
            );
        } catch (error) {
            response.status = 'not subscribed'
        }

        if (response.status == 'subscribed'){
            await mailchimp.lists.updateListMember(
                mailchimpListId,
                email,
                {
                  status: "unsubscribed"
                }
              );
        }

        res.json({
            msg: `Email unsubscribed`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/newsletters
// @desc    Get all subscribed emails
// @access  Private
router.get('/', adminAuth, async (req, res) => {

    try {

        const newsletters = await Newsletter.find()

        res.json(newsletters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    GET api/newsletters/search/:key
// @desc     Get all newsletters matching with key
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
                    }}
                ]
            }
        }

        const newsletters = await Newsletter.find(query)
            .select('firstName lastName email')

        res.json(newsletters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;