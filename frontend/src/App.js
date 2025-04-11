import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [products, setProducts] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [userId] = useState(() => localStorage.getItem('userId') || crypto.randomUUID());
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem(`cart_${userId}`);
            return savedCart ? JSON.parse(savedCart) : { items: [], total: 0 };
        } catch (e) {
            return { items: [], total: 0 };
        }
    });
    const [loadingStates, setLoadingStates] = useState({}); 
    const [rateLimited, setRateLimited] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterPrice, setFilterPrice] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null); 
    const [wishlist, setWishlist] = useState(() => {
        try {
            const savedWishlist = localStorage.getItem(`wishlist_${userId}`);
            return savedWishlist ? JSON.parse(savedWishlist) : [];
        } catch (e) {
            return [];
        }
    }); 

    const chatContainerRef = useRef(null);
    const recognitionRef = useRef(null);

    const addMessage = useCallback((text, sender) => {
        // Prevent duplicate messages by checking if the last message is the same
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.text !== text || lastMessage.sender !== sender) {
            setMessages(prev => [...prev, { text, sender }]);
        }
    }, [messages]);

    useEffect(() => {
        localStorage.setItem('userId', userId);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results?.[0]?.[0]?.transcript || '';
                setInput(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                addMessage('Error with voice input. Please try typing.', 'Assistant');
            };
        }

        const availableCategories = ['electronics', 'clothing', 'home', 'books'].join(', ');
        addMessage(`Hello! I'm your virtual shopping assistant. Available categories are: ${availableCategories}. How can I help you today?`, 'Assistant');

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [userId, addMessage]);

    useEffect(() => {
        if (cart) {
            localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
        }
        if (wishlist) {
            localStorage.setItem(`wishlist_${userId}`, JSON.stringify(wishlist));
        }
    }, [cart, userId, wishlist]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages, products, cart, selectedProduct, wishlist]);

    const toggleVoiceInput = () => {
        if (!recognitionRef.current) {
            addMessage("Voice input is not supported in your browser", 'Assistant');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            addMessage("Listening... Speak now", 'Assistant');
        }
    };

    const handleSearchInputChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleSearchSubmit = () => {
        if (searchQuery.trim()) {
            sendMessage(searchQuery.trim());
            setSearchQuery('');
        }
    };

    const sendMessage = async (messageToSend = input.trim()) => {
        const userMessage = messageToSend.toLowerCase();
        if (!userMessage) return;

        addMessage(userMessage, 'You');
        setInput('');
        setLoadingStates(prev => ({ ...prev, sendMessage: true }));
        setRateLimited(false);

        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                addMessage('Too many requests. Please wait a moment and try again.', 'Assistant');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Request failed');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.action === 'show_products') {
                setProducts(data.products);
                setFilterName('');
                setFilterPrice('');
                setSelectedProduct(null); 
            } else if (data.action === 'add_to_cart' || data.action === 'view_cart' || data.action === 'update_cart') {
                setCart(data.cart);
                setProducts(null);
                setSelectedProduct(null); 
            } else if (data.reply) {
                addMessage(data.reply, 'Assistant');
            } else if (userMessage.includes('suggest some clothes') || userMessage.includes('clothing suggestions')) {
                handleClothingSuggestions(userMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage(error.message || 'An unknown error occurred', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, sendMessage: false }));
        }
    };

    const handleClothingSuggestions = async (message) => {
        let category = 'clothing';
        const categoryMatch = message.match(/for\s+(.+)/i);
        if (categoryMatch && categoryMatch[1]) {
            category = categoryMatch[1].trim().toLowerCase();
        }

        setLoadingStates(prev => ({ ...prev, clothingSuggestions: true }));
        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `show_products(category: "${category}")`,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                addMessage('Too many requests. Please wait a moment and try again.', 'Assistant');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch clothing suggestions');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            if (data.products && data.products.length > 0) {
                setProducts(data.products);
                addMessage(`Here are some clothing suggestions${category !== 'clothing' ? ` for ${category}` : ''}:`, 'Assistant');
            } else {
                addMessage(`Sorry, I couldn't find any clothing suggestions${category !== 'clothing' ? ` for ${category}` : ''}. Please try a different category or search term.`, 'Assistant');
            }
        } catch (error) {
            console.error('Error fetching clothing suggestions:', error);
            addMessage(error.message || 'Failed to fetch clothing suggestions', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, clothingSuggestions: false }));
        }
    };

    const addToCart = async (productId) => {
        setLoadingStates(prev => ({ ...prev, [productId]: true }));
        setRateLimited(false);
        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `add_to_cart(product_id: "${productId}", quantity: 1)`,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                addMessage('Too many requests. Please wait a moment and try again.', 'Assistant');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add item to cart');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            setCart(data.cart);
            const addedProduct = products && products.find(p => p.id === productId);
            addMessage(addedProduct ? `Added "${addedProduct.name}" to your cart!` : 'Item added to cart!', 'Assistant');
            setProducts(null);
            setSelectedProduct(null); 
        } catch (error) {
            console.error('Error adding to cart:', error);
            addMessage(error.message || 'Failed to add item to cart', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, [productId]: false }));
        }
    };

    const saveForLater = async (productId) => {
        setLoadingStates(prev => ({ ...prev, [`save_${productId}`]: true }));
        setRateLimited(false);
        try {
            const product = products.find(p => p.id === productId) || wishlist.find(p => p.id === productId);
            if (!product) {
                throw new Error('Product not found');
            }

            
            if (wishlist.some(item => item.id === productId)) {
                addMessage(`${product.name} is already in your wishlist!`, 'Assistant');
                return;
            }

        
            const updatedWishlist = [...wishlist, { ...product, quantity: 1 }];
            setWishlist(updatedWishlist);

            addMessage(`Saved "${product.name}" to your wishlist!`, 'Assistant');
        } catch (error) {
            console.error('Error saving for later:', error);
            addMessage(error.message || 'Failed to save item for later', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`save_${productId}`]: false }));
        }
    };

    const updateCart = async (productId, quantityChange) => {
        setLoadingStates(prev => ({ ...prev, [`update_${productId}`]: true }));
        setRateLimited(false);
        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `update_cart(product_id: "${productId}", quantity_change: ${quantityChange})`,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update cart');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setCart(data.cart);
        } catch (error) {
            console.error('Error updating cart:', error);
            addMessage(error.message || 'Error updating cart', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`update_${productId}`]: false }));
        }
    };

    const incrementItem = (productId) => {
        updateCart(productId, 1);
    };

    const decrementItem = (productId) => {
        updateCart(productId, -1);
    };

    const removeItem = async (productId) => {
        setLoadingStates(prev => ({ ...prev, [`remove_${productId}`]: true }));
        setRateLimited(false);
        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `remove_from_cart(product_id: "${productId}")`,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove item from cart');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setCart(data.cart);
            const removedProduct = cart.items.find(item => item.id === productId);
            addMessage(`Removed "${removedProduct?.name || 'item'}" from your cart!`, 'Assistant');
            // Reset wishlist state if the removed item was in both cart and wishlist
            if (wishlist.some(item => item.id === productId)) {
                setWishlist(wishlist.filter(item => item.id !== productId));
                addMessage(`Removed "${removedProduct?.name || 'item'}" from wishlist as it was removed from cart.`, 'Assistant');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            addMessage(error.message || 'Error removing item from cart', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`remove_${productId}`]: false }));
        }
    };

    const checkout = async () => {
        setLoadingStates(prev => ({ ...prev, checkout: true }));
        setRateLimited(false);
        try {
            const response = await fetch('http://localhost:3001/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                addMessage('Too many requests. Please wait a moment and try again.', 'Assistant');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Checkout failed');
            }

            const data = await response.json();

            if (data.success) {
                setCart({ items: [], total: 0 });
                addMessage(data.message, 'Assistant');
                addMessage(`Order ID: ${data.order.orderId}\nTotal: $${data.order.total.toFixed(2)}`, 'System');
            } else {
                addMessage(data.message, 'Assistant');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            addMessage(error.message || 'Failed to complete checkout', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, checkout: false }));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    
    const filteredProducts = products
        ? products.filter(product => {
            const matchesName = product.name.toLowerCase().includes(filterName.toLowerCase());
            const matchesPrice = filterPrice ? product.price <= parseFloat(filterPrice) : true;
            return matchesName && matchesPrice;
        })
        : [];

    
    const openProductDetails = (product) => {
        setSelectedProduct(product);
    };

    
    const closeProductDetails = () => {
        setSelectedProduct(null);
    };

    
    const moveToCartFromWishlist = async (productId) => {
        setLoadingStates(prev => ({ ...prev, [`move_${productId}`]: true }));
        setRateLimited(false);
        try {
            const product = wishlist.find(p => p.id === productId);
            if (!product) {
                throw new Error('Product not found in wishlist');
            }

            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `add_to_cart(product_id: "${productId}", quantity: ${product.quantity})`,
                    userId
                }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                setTimeout(() => setRateLimited(false), 5000);
                addMessage('Too many requests. Please wait a moment and try again.', 'Assistant');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to move item to cart');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            setCart(data.cart);
            setWishlist(wishlist.filter(item => item.id !== productId));
            addMessage(`Moved "${product.name}" from wishlist to cart!`, 'Assistant');
        } catch (error) {
            console.error('Error moving to cart:', error);
            addMessage(error.message || 'Failed to move item to cart', 'Assistant');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`move_${productId}`]: false }));
        }
    };

    // Remove item from wishlist
    const removeFromWishlist = (productId) => {
        setLoadingStates(prev => ({ ...prev, [`wishlistRemove_${productId}`]: true }));
        setWishlist(wishlist.filter(item => item.id !== productId));
        const removedProduct = wishlist.find(p => p.id === productId);
        addMessage(`Removed "${removedProduct?.name || 'item'}" from your wishlist!`, 'Assistant');
        setLoadingStates(prev => ({ ...prev, [`wishlistRemove_${productId}`]: false }));
    };

    return (
        <div className="App">
            {rateLimited && (
                <div className="rate-limit-overlay">
                    <div className="rate-limit-message">
                        Too many requests. Please wait a moment and try again.
                    </div>
                </div>
            )}
            <header className="app-header">
                <h1>Virtual Shopping Assistant</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                    />
                    <button onClick={handleSearchSubmit} disabled={loadingStates.sendMessage || loadingStates.clothingSuggestions}>
                        {loadingStates.sendMessage || loadingStates.clothingSuggestions ? <div className="spinner" /> : 'Search'}
                    </button>
                </div>
                <div className="cart-summary">
                    <span>Cart: {cart.items.reduce((t, i) => t + (i.quantity || 0), 0)} items</span>
                    <span>Total: ${cart.total.toFixed(2)}</span>
                    {cart.items.length > 0 && (
                        <button onClick={checkout} className="checkout-btn" disabled={loadingStates.checkout}>
                            {loadingStates.checkout ? <div className="spinner" /> : 'Checkout'}
                        </button>
                    )}
                    {wishlist.length > 0 && (
                        <span>Wishlist: {wishlist.length} items</span>
                    )}
                </div>
            </header>

            <div className="chat-container" ref={chatContainerRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.sender.toLowerCase()}`}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}

                {cart.items.length > 0 && (
                    <div className="message assistant">
                        <strong>Assistant:</strong> Your Cart:
                        {cart.items.map(item => (
                            <div key={item.id} className="cart-item">
                                {item.name} (Qty: {item.quantity}) - ${(item.price * item.quantity).toFixed(2)}
                                <div className="quantity-controls">
                                    <button onClick={() => decrementItem(item.id)} disabled={loadingStates[`update_${item.id}`]}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => incrementItem(item.id)} disabled={loadingStates[`update_${item.id}`]}>+</button>
                                </div>
                                <button onClick={() => removeItem(item.id)} className="remove-item-btn" disabled={loadingStates[`remove_${item.id}`]}>
                                    {loadingStates[`remove_${item.id}`] ? <div className="spinner" /> : 'Remove'}
                                </button>
                            </div>
                        ))}
                        <div className="cart-total">Total: ${cart.total.toFixed(2)}</div>
                    </div>
                )}

                {wishlist.length > 0 && (
                    <div className="message assistant">
                        <strong>Assistant:</strong> Your Wishlist:
                        {wishlist.map(item => (
                            <div key={item.id} className="cart-item">
                                {item.name} (Qty: {item.quantity}) - ${(item.price * item.quantity).toFixed(2)}
                                <button onClick={() => moveToCartFromWishlist(item.id)} className="add-to-cart-btn" disabled={loadingStates[`move_${item.id}`]}>
                                    {loadingStates[`move_${item.id}`] ? <div className="spinner" /> : 'Move to Cart'}
                                </button>
                                <button onClick={() => removeFromWishlist(item.id)} className="remove-item-btn" disabled={loadingStates[`wishlistRemove_${item.id}`]}>
                                    {loadingStates[`wishlistRemove_${item.id}`] ? <div className="spinner" /> : 'Remove'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {products && (
                    products.length === 0 ? (
                        <div className="message assistant">
                            <strong>Assistant:</strong> Sorry, I couldn't find any products matching your request.
                        </div>
                    ) : (
                        <div className="products-display">
                            <h3>Recommended Products:</h3>
                            {/* Filter Controls */}
                            <div className="filter-controls">
                                <input
                                    type="text"
                                    placeholder="Filter by name..."
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    className="filter-input"
                                />
                                <input
                                    type="number"
                                    placeholder="Max price..."
                                    value={filterPrice}
                                    onChange={(e) => setFilterPrice(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="filter-input"
                                />
                            </div>
                            <div className="products-grid">
                                {filteredProducts.length === 0 ? (
                                    <p>No products match your filters.</p>
                                ) : (
                                    filteredProducts.map(product => (
                                        <div key={product.id} className="product-card" onClick={() => openProductDetails(product)}>
                                            <h4>{product.name}</h4>
                                            {product.imageUrl && (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="product-image"
                                                />
                                            )}
                                            <p>{product.description}</p>
                                            <p className="price">${product.price.toFixed(2)}</p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
                                                className="add-to-cart-btn"
                                                disabled={loadingStates[product.id]}
                                            >
                                                {loadingStates[product.id] ? <div className="spinner" /> : 'Add to Cart'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); saveForLater(product.id); }}
                                                className="save-for-later-btn"
                                                disabled={loadingStates[`save_${product.id}`]}
                                            >
                                                {loadingStates[`save_${product.id}`] ? <div className="spinner" /> : 'Save for Later'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                )}

                {/* Product Details Page Modal */}
                {selectedProduct && (
                    <div className="product-details-modal" onClick={closeProductDetails}>
                        <div className="product-details-content" onClick={e => e.stopPropagation()}>
                            <button className="close-btn" onClick={closeProductDetails}>×</button>
                            <h2>{selectedProduct.name}</h2>
                            <div className="product-images">
                                {selectedProduct.imageUrl && (
                                    <>
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="main-image" />
                                        {/* Simulate multiple angles with additional images (expand with backend data if available) */}
                                        <div className="thumbnail-gallery">
                                            <img src={selectedProduct.imageUrl} alt={`${selectedProduct.name} angle 1`} className="thumbnail" />
                                            <img src={selectedProduct.imageUrl} alt={`${selectedProduct.name} angle 2`} className="thumbnail" />
                                            <img src={selectedProduct.imageUrl} alt={`${selectedProduct.name} angle 3`} className="thumbnail" />
                                        </div>
                                    </>
                                )}
                            </div>
                            <p className="product-description">{selectedProduct.description || 'No detailed description available.'}</p>
                            <p className="availability">Availability: {selectedProduct.availability || 'In Stock'}</p>
                            <p className="shipping-info">Estimated Delivery: {selectedProduct.shippingInfo || '3-5 business days (standard shipping)'}</p>
                            <p className="price">${selectedProduct.price.toFixed(2)}</p>
                            <button onClick={() => addToCart(selectedProduct.id)} className="add-to-cart-btn" disabled={loadingStates[selectedProduct.id]}>
                                {loadingStates[selectedProduct.id] ? <div className="spinner" /> : 'Add to Cart'}
                            </button>
                            <button onClick={() => saveForLater(selectedProduct.id)} className="save-for-later-btn" disabled={loadingStates[`save_${selectedProduct.id}`]}>
                                {loadingStates[`save_${selectedProduct.id}`] ? <div className="spinner" /> : 'Save for Later'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="input-area">
                <button
                    onClick={toggleVoiceInput}
                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                    disabled={loadingStates.sendMessage || isListening}
                    aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                    aria-pressed={isListening}
                >
                    {isListening ? '🛑 Stop' : '🎤 Voice'}
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={loadingStates.sendMessage || isListening}
                />
                <button
                    onClick={() => sendMessage()}
                    disabled={loadingStates.sendMessage || !input.trim()}
                >
                    {loadingStates.sendMessage ? <div className="spinner" /> : 'Send'}
                </button>
            </div>
        </div>
    );
}

export default App;
