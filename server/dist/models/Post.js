"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const postSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true,
        maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    subject: {
        type: String,
        trim: true,
        default: "General",
        maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    llmName: {
        type: String,
        required: [true, "LLM name is required"],
        enum: ["OpenAI", "Claude", "Gemini"],
    },
    chatLink: {
        type: String,
        trim: true,
        default: "",
    },
    tags: {
        type: [String],
        default: [],
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    upvotesCount: {
        type: Number,
        default: 0,
    },
    downvotesCount: {
        type: Number,
        default: 0,
    },
    commentsCount: {
        type: Number,
        default: 0,
    },
    embeddingStatus: {
        type: String,
        enum: ['pending', 'queued', 'completed', 'failed'],
        default: 'pending',
    },
    embeddingJobId: {
        type: String,
        default: null,
    },
    embeddingError: {
        type: String,
        default: null,
    },
    embeddingUpdatedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
postSchema.index({ title: "text", description: "text" });
exports.default = mongoose_1.default.model("Post", postSchema);
