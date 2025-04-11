require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
// const { MongoClient } = require('mongodb'); // Uncomment if using MongoDB

const app = express();
const port = process.env.PORT || 3001;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not set in environment variables.');
    process.exit(1);
}


const products = {
    electronics: [
        { 
            id: uuidv4(), 
            name: "Wireless Headphones", 
            price: 99.99, 
            description: "Noise-cancelling Bluetooth headphones", 
            category: "electronics", 
            imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Smartphone", 
            price: 699.99, 
            description: "Latest model with 128GB storage", 
            category: "electronics", 
            imageUrl: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Laptop", 
            price: 999.99, 
            description: "15-inch, 16GB RAM, 512GB SSD", 
            category: "electronics", 
            imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Smartwatch", 
            price: 199.99, 
            description: "Fitness tracker and notifications", 
            category: "electronics", 
            imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Tablet", 
            price: 349.99, 
            description: "10-inch display, 64GB storage", 
            category: "electronics", 
            imageUrl: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        }
    ],
    clothing: [
        { 
            id: uuidv4(), 
            name: "T-Shirt", 
            price: 19.99, 
            description: "Cotton crew neck t-shirt", 
            category: "clothing", 
            imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Jeans", 
            price: 49.99, 
            description: "Slim fit denim jeans", 
            category: "clothing", 
            imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Jacket", 
            price: 89.99, 
            description: "Waterproof windbreaker", 
            category: "clothing", 
            imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Sweater", 
            price: 59.99, 
            description: "Wool blend crew neck sweater", 
            category: "clothing", 
            imageUrl: "https://images.unsplash.com/photo-1715176531842-7ffda4acdfa9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHN3ZWF0ZXJ8ZW58MHx8MHx8fDA%3D" 
        },
        { 
            id: uuidv4(), 
            name: "Dress", 
            price: 79.99, 
            description: "Summer casual dress", 
            category: "clothing", 
            imageUrl: "https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZHJlc3N8ZW58MHx8MHx8fDA%3D" 
        }
    ],
    home: [
        { 
            id: uuidv4(), 
            name: "Coffee Maker", 
            price: 59.99, 
            description: "Programmable 12-cup coffee maker", 
            category: "home", 
            imageUrl: "https://images.unsplash.com/photo-1608354580875-30bd4168b351?q=80&w=3687&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
        },
        { 
            id: uuidv4(), 
            name: "Blender", 
            price: 39.99, 
            description: "High-speed countertop blender", 
            category: "home", 
            imageUrl: "https://images.unsplash.com/photo-1577495917765-9497a0de7caa?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8YmxlbmRlcnxlbnwwfHwwfHx8MA%3D%3D" 
        },
        { 
            id: uuidv4(), 
            name: "Air Fryer", 
            price: 79.99, 
            description: "Digital air fryer with multiple presets", 
            category: "home", 
            imageUrl: "https://media.istockphoto.com/id/2169555145/photo/a-woman-is-using-an-air-fryer-to-prepare-food-in-her-kitchen-focusing-on-a-healthier-cooking.webp?a=1&b=1&s=612x612&w=0&k=20&c=Ln0HZJ_rzu9QC-W4kzcXs7U0H15li1S3-8p_qEjXRJM=" 
        },
        { 
            id: uuidv4(), 
            name: "Toaster", 
            price: 29.99, 
            description: "4-slice stainless steel toaster", 
            category: "home", 
            imageUrl: "https://plus.unsplash.com/premium_photo-1718559007766-3ff6232a7456?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8dG9hc3RlcnxlbnwwfHwwfHx8MA%3D%3D" 
        },
        { 
            id: uuidv4(), 
            name: "Vacuum Cleaner", 
            price: 129.99, 
            description: "Bagless upright vacuum cleaner", 
            category: "home", 
            imageUrl: "https://media.istockphoto.com/id/927031764/photo/vacuum-cleaner-isolated-on-white-background.webp?a=1&b=1&s=612x612&w=0&k=20&c=3qZMvo_UghehTOWNmQl0HitEm59T0SWOZTuXtUjzKhQ=" 
        }
    ],
    books: [
        { 
            id: uuidv4(), 
            name: "The Great Gatsby", 
            price: 10.99, 
            description: "A classic novel by F. Scott Fitzgerald", 
            category: "books", 
            imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "To Kill a Mockingbird", 
            price: 12.50, 
            description: "A powerful story by Harper Lee", 
            category: "books", 
            imageUrl: "https://images.unsplash.com/photo-1589998059171-988d887df646?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        },
        { 
            id: uuidv4(), 
            name: "Sapiens", 
            price: 15.75, 
            description: "A brief history of humankind by Yuval Noah Harari", 
            category: "books", 
            imageUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
        }
    ]
};


const carts = {};

app.use(cors());
app.use(express.json());

const systemPrompt = {
    role: 'system',
    parts: [{
        text: `You are a helpful virtual shopping assistant named ShopBot. Your role is to:
1. Help users find products based on their needs and budget
2. Provide product recommendations from our inventory
3. Assist with adding, updating (increment/decrement), and removing items from the cart
4. Assist with completing purchases
5. Answer questions about products, shipping, and returns

Available product categories: ${Object.keys(products).join(', ')}.

When users ask to see their cart, use the view_cart function.
When users want to update the quantity of an item, they might say things like "increase the quantity of [product name]", "add one more [product name]", "decrease [product name]", "remove [product name]". Try to infer the product ID and the quantity change from their request and use the update_cart or remove_from_cart functions accordingly.

Available functions:
show_products(category: string)
add_to_cart(product_id: string, quantity: number)
update_cart(product_id: string, quantity_change: number)
remove_from_cart(product_id: string)
view_cart()`
    }]
};

let conversationHistory = [systemPrompt];

async function generateContent(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: prompt.filter(entry => entry.role !== 'system'),
        tools: [{
            function_declarations: [
                {
                    name: 'show_products',
                    description: 'Show products from a specific category',
                    parameters: {
                        type: 'object',
                        properties: {
                            category: {
                                type: 'string',
                                enum: Object.keys(products)
                            }
                        },
                        required: ['category']
                    }
                },
                {
                    name: 'add_to_cart',
                    description: 'Add a product to the shopping cart',
                    parameters: {
                        type: 'object',
                        properties: {
                            product_id: { type: 'string' },
                            quantity: { type: 'integer', minimum: 1 }
                        },
                        required: ['product_id', 'quantity']
                    }
                },
                {
                    name: 'update_cart',
                    description: 'Update the quantity of a product in the shopping cart',
                    parameters: {
                        type: 'object',
                        properties: {
                            product_id: { type: 'string' },
                            quantity_change: { type: 'integer' }
                        },
                        required: ['product_id', 'quantity_change']
                    }
                },
                {
                    name: 'remove_from_cart',
                    description: 'Remove a product from the shopping cart',
                    parameters: {
                        type: 'object',
                        properties: {
                            product_id: { type: 'string' }
                        },
                        required: ['product_id']
                    }
                },
                {
                    name: 'view_cart',
                    description: 'View the current contents of the shopping cart',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error('Invalid API response structure');
        }
        return data;

    } catch (error) {
        console.error('API Request Failed:', error);
        return {
            error: {
                code: 500,
                message: "Service unavailable. Please try again."
            },
            fallbackProducts: Object.values(products).flat()
        };
    }
}

app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    if (message.startsWith('show_products')) {
        const categoryMatch = message.match(/category:\s*"([^"]+)"/);
        const category = categoryMatch ? categoryMatch[1].toLowerCase() : 'all';
        let filteredProducts = products;
        if (category !== 'all') {
            filteredProducts = products.filter(p => p.category === category);
        }
        res.json({ action: 'show_products', products: filteredProducts });
        return;
    }
    if (!userId || !message) {
        return res.status(400).send({ error: 'User ID and message are required' });
    }

    if (!carts[userId]) carts[userId] = { items: [], total: 0 };

    conversationHistory.push({ role: 'user', parts: [{ text: message }] });

    const result = await generateContent(conversationHistory);

    if (result.error) {
        return res.status(result.error.code).send({
            error: result.error.message,
            ...(result.fallbackProducts && { products: result.fallbackProducts })
        });
    }

    const content = result.candidates[0].content;
    let responseData = {};

    if (content.parts[0].functionCall) {
        const { name, args } = content.parts[0].functionCall;

        if (name === 'show_products') {
            const category = args.category?.toLowerCase();
            if (!category || !products[category]) {
                return res.send({
                    reply: `Invalid category. Available: ${Object.keys(products).join(', ')}`,
                    products: result.fallbackProducts || [],
                    action: 'show_products'
                });
            }
            responseData = {
                reply: `Here are ${category} products:`,
                products: products[category],
                action: 'show_products'
            };
        }
        else if (name === 'add_to_cart') {
            const { product_id, quantity } = args;
            let product;

            for (const category of Object.values(products)) {
                product = category.find(p => p.id === product_id);
                if (product) break;
            }

            if (!product) {
                return res.status(404).send({ error: 'Product not found' });
            }

            const existingItem = carts[userId].items.find(item => item.id === product_id);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                carts[userId].items.push({ ...product, quantity });
            }
            carts[userId].total += product.price * quantity;

            responseData = {
                reply: `Added ${quantity} ${product.name}(s) to cart`,
                cart: carts[userId],
                action: 'add_to_cart'
            };
        }
        else if (name === 'update_cart') {
            const { product_id, quantity_change } = args;
            const cartItem = carts[userId].items.find(item => item.id === product_id);
            if (!cartItem) {
                return res.status(404).send({ error: 'Product not found in cart' });
            }
            const newQuantity = (cartItem.quantity || 1) + quantity_change;
            if (newQuantity < 1) {
                carts[userId].items = carts[userId].items.filter(item => item.id !== product_id);
                responseData = { reply: `${cartItem.name} removed from cart`, cart: carts[userId], action: 'update_cart' };
            } else {
                cartItem.quantity = newQuantity;
                carts[userId].total = carts[userId].items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                responseData = { reply: `Updated quantity of ${cartItem.name} to ${newQuantity}`, cart: carts[userId], action: 'update_cart' };
            }
        }
        else if (name === 'remove_from_cart') {
            const { product_id } = args;
            const initialLength = carts[userId].items.length;
            carts[userId].items = carts[userId].items.filter(item => item.id !== product_id);
            if (carts[userId].items.length < initialLength) {
                carts[userId].total = carts[userId].items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                responseData = { reply: 'Product removed from cart', cart: carts[userId], action: 'update_cart' };
            } else {
                return res.status(404).send({ error: 'Product not found in cart' });
            }
        }
        else if (name === 'view_cart') {
            if (carts[userId].items.length === 0) {
                responseData = {
                    reply: "Your cart is currently empty.",
                    cart: carts[userId],
                    action: 'view_cart'
                };
            } else {
                const cartContents = carts[userId].items.map(item =>
                    `${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
                ).join('\n');

                responseData = {
                    reply: `Your Cart:\n${cartContents}\nTotal: $${carts[userId].total.toFixed(2)}`,
                    cart: carts[userId],
                    action: 'view_cart'
                };
            }
        }
        conversationHistory.push({ role: 'model', parts: [content.parts[0]] }); 
        conversationHistory.push({ role: 'model', parts: [{ text: responseData.reply }] }); 
    } else {
        
        conversationHistory.push({ role: 'model', parts: [{ text: content.parts[0].text }] });
        responseData = {
            reply: content.parts[0].text,
            action: 'text_response'
        };
    }

    return res.send(responseData);
});

app.post('/checkout', (req, res) => {
    const { userId } = req.body;

    if (!userId || !carts[userId]) {
        return res.status(400).send({ error: 'Invalid user ID or cart' });
    }

    if (carts[userId].items.length === 0) {
        return res.send({ success: false, message: 'Cart is empty' });
    }

    const order = {
        orderId: uuidv4(),
        items: carts[userId].items,
        total: carts[userId].total,
        date: new Date().toISOString()
    };

    carts[userId] = { items: [], total: 0 };
    return res.send({
        success: true,
        message: 'Order placed successfully!',
        order
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
