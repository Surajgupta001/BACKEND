import mongoose from 'mongoose'

const orderItemsSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },

    quantity: {
        type: Number,
        required: true,
    }
})

const orderSchema = new mongoose.Schema({
    orderPrice: {
        type: Number,
        required: true,
    },

    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    orderItems: {
        type: [orderItemsSchema],
    },

    address: {
        type: String,
        required: true,
    },

    orderStatus: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending',
    },

}, {timestamp: true});


export const Order = mongoose.model('Order', orderSchema);