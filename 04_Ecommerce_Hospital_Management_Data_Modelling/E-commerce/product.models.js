import mongoose from 'mongoose'
import { Category } from './category.modules'

const productSchema = new mongoose.Schema({
    descriptions: {
        type: String,
        required: true,
    },

    name: {
        type: String,
        required: true,
    },

    productImage: {
        type: String,
    },

    price: {
        type: Number,
        default: 0,
    },

    stock: {
        type: Number,
        default: 0,
    },

    category: {
        type: mongoose.Schema.Type.ObjectId,
        ref: 'Category',
        required: true,
    },

    owner: {
        type: mongoose.Schema.Type.ObjectId,
        ref: 'User',
    }

}, {timestamp: true})

export const Product = mongoose.model('Product', productSchema)