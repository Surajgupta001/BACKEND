import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },

    completed: {
        type: Boolean,
        default: false,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    subTodos: [{ // Arrays of sub-Todos
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubTodo',
    }]

}, {timestamps: true});

export const Todo = mongoose.model('Todo', todoSchema);