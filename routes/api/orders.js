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
const Client = require('../../models/client.model');
const Order = require('../../models/order.model');
const Admin = require('../../models/admin.model');
const Equipment = require('../../models/equipment.model');
const jwt = require('jsonwebtoken');
const clientSecret = config.get('jwtClientSecret')
const transporter = require('./../../config/email');

// @route    GET api/orders/:id
// @desc     Get an order by ID
// @access   Private
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id
        })
        .populate({
            path: 'clientId',
            select: ['firstName', 'lastName', 'address', 'phoneNumber', 'email']
        })
        .populate({
            path: 'equipmentId',
            select: ['name', 'type', 'serialId', 'phoneNumber', 'sellPrice', 'rentPrice']
        })
        .populate({
            path: 'adminId',
            select: ['name', 'email']
        })

        if (!order)
            return res.status(400).json({
                msg: 'Order not found'
            });

        return res.json(order);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            msg: 'Server error'
        });
    }
});

// @route   POST api/orders
// @desc    Place an order
// @access  Private
router.post('/', adminAuth, [
    check('clientId', 'Client ID required').notEmpty(),
    check('equipmentId','Equipment ID required').notEmpty(),
    check('totalPrice','Total price should be a number').isNumeric(),
    check('isRent','Should provide if the order is for rent or sale').notEmpty(),
    check('rentExpiry','Rent expiry date is required').notEmpty()
],async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }
    
    const {
        clientId,
        equipmentId,
        totalPrice,
        isRent,
        rentExpiry
    } = req.body

    const adminId = req.admin.admin.id

    try {

        const client = await Client.findById(clientId)

        if(!client){
            return res.status(400).json({
                errors: [{
                    msg: `There is no client with id ${clientId}`
                }]
            });
        }

        const equipment = await Equipment.findById(equipmentId)

        if(!equipment){
            return res.status(400).json({
                errors: [{
                    msg: `There is no equipment with id ${equipmentId}`
                }]
            });
        }

        const order = new Order({
            clientId,
            adminId,
            equipmentId,
            totalPrice,
            isRent,
            rentExpiry
        })

        await order.save()

        const savedOrder =  await Order.findOne({
            adminId: adminId,
            clientId: clientId,
            equipmentId: equipmentId
        })
        
        await Client.findOneAndUpdate({
            _id: clientId
        }, {
            $addToSet: {
                orders: savedOrder._id
            }
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
            const htmloutput = `<h3>Hi, ${client.name}! We have placed your order</h3>`

            // send mail with defined transport object
            transporter.sendMail({
                from: `Lifts for Life <${config.get('emailAddress')}`, // sender address
                to: `${client.email}`, // list of receivers
                subject: "ORDER DETAILS - Lifts for Life", // Subject line
                text: "", // plain text body
                html: htmloutput, // html body
            });

            res.json({
                message: `Order placed for client ${client.name}`
            })
        })

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/orders
// @desc    Get all orders
// @access  Private
router.get('/', adminAuth, async (req, res) => {

    try {
        const orders = await Order.find()
        .populate({
            path: 'clientId',
            select: ['firstName', 'lastName', 'address', 'phoneNumber', 'email']
        })
        .populate({
            path: 'equipmentId',
            select: ['name', 'type', 'serialId', 'phoneNumber', 'sellPrice', 'rentPrice']
        })
        .populate({
            path: 'adminId',
            select: ['name', 'email']
        })

        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/orders
// @desc    Delete an order by ID
// @access  Private
router.delete('/:id', adminAuth, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    const adminId = req.admin.admin.id

    const orderId = req.params.id

    try {

        const admin = await Admin.findById(adminId)

        if(!admin){
            return res.status(400).json({
                errors: [{
                    msg: `Admin not found! Deleting an order requires an admin role`
                }]
            });
        }

        const order = await Order.findByIdAndDelete(orderId)

        if(!order){
            return res.status(400).json({
                errors: [{
                    msg: `There is no order with id ${orderId}`
                }]
            });
        }

        await Client.findOneAndUpdate({
            _id: order.clientId
        },{
            $pull: {
                orders: order._id
            }
        })

        res.json({
            msg: `Order removed`
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/orders
// @desc    Update an order by id
// @access  Private
router.put('/:id',[
    check('totalPrice','Total price should be a number').isNumeric(),
    check('isRent','Should provide if the order is for rent or sale').not().isEmpty(),
    check('rentExpiry','Rent expiry date is required').not().isEmpty()
],async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }
    
    const {
        totalPrice,
        isRent,
        rentExpiry
    } = req.body

    const orderId = req.params.id

    try {

        const order = await Order.findOneAndUpdate({
            _id: orderId
        },{
            totalPrice,
            isRent,
            rentExpiry
        })
        .populate({
            path: 'clientId',
            select: ['firstName', 'lastName', 'address', 'phoneNumber', 'email']
        })
        .populate({
            path: 'equipmentId',
            select: ['name', 'type', 'serialId', 'phoneNumber', 'sellPrice', 'rentPrice']
        })
        .populate({
            path: 'adminId',
            select: ['name', 'email']
        })

        if(!order){
            return res.status(400).json({
                errors: [{
                    msg: `There is no order with id ${orderId}`
                }]
            });
        }

        res.json({
            msg: `Order updated!`,
            order: order
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;