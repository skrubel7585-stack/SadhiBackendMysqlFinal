// Updated controller with Razorpay integration
const User = require('../models/User');
const Chat = require('../models/Chat');
const Photo = require('../models/Photo');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mYFRQUddrXZ4Uv',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_test_secret_key'
});

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// Generate unique user ID
const generateUserGenId = () => {
    return 'SR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Helper function to calculate age
function calculateAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount = 99, currency = 'INR' } = req.body;
        
        const options = {
            amount: amount * 100, // Amount in paise
            currency: currency,
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1,
            notes: {
                user_id: req.userId || 'guest'
            }
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mYFRQUddrXZ4Uv'
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify-payment
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'your_test_secret_key')
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Payment is successful
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Register new user with payment
// @route   POST /api/users/register
const registerUser = async (req, res) => {
    try {
        const {
            // Step 1: Basic Info
            name, email, mobileNumber, password, gender, lookingFor,
            
            // Step 2: Personal Details
            dateOfBirth, religion, caste, motherTongue, maritalStatus,
            hasKids, childrenCount, boysCount, girlsCount, childrenNames,
            whoYouStayWith, whereYouBelong,
            
            // Step 3: Professional Details
            education, school, college, occupation, annualIncome,
            companyName, currentResident,
            
            // Step 4: Address & Lifestyle
            address, height, weight, diet, smoking, drinking, hobbies,
            
            // Step 5: Family & About
            fatherName, motherName, disability, about,
            
            // Partner Preferences
            partnerPreferences = {},
            
            // Payment Info
            paymentId, paymentAmount = 99, paymentStatus = 'pending'
        } = req.body;

        // Validate required fields
        if (!name || !email || !mobileNumber || !password || !gender || !lookingFor) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, mobileNumber, password, gender, lookingFor'
            });
        }

        // Check if user exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const existingPhone = await User.findByPhone(mobileNumber);
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered'
            });
        }

        // Generate unique ID
        const user_gen_id = generateUserGenId();
        
        // Calculate age from DOB
        let age = null;
        if (dateOfBirth) {
            age = calculateAge(dateOfBirth);
        }

        // Prepare user data for database
        const userData = {
            user_gen_id,
            user_name: name,
            user_namecast: lookingFor,
            user_nameintercast: lookingFor,
            user_religion: religion || '',
            user_mother_tongue: motherTongue || '',
            user_gender: gender,
            user_phone: mobileNumber,
            user_email: email,
            user_pass: password, // Plain text as per your requirement
            user_status: paymentId ? 1 : 0, // Active only if payment is done
            user_payment_status: paymentId ? 'completed' : 'pending',
            user_otp_status: 0,
            user_city: address?.city || '',
            user_state: address?.state || '',
            user_country: address?.country || 'India',
            user_dob: dateOfBirth || null,
            user_height: height || '',
            user_weight: weight || '',
            user_fatherName: fatherName || '',
            user_motherName: motherName || '',
            user_address: address?.fullAddress || '',
            user_jobType: occupation || '',
            user_companyName: companyName || '',
            user_currentResident: currentResident || '',
            user_salary: annualIncome || '',
            user_degree: education?.highestDegree || '',
            user_school: school || '',
            user_collage: college || '',
            user_hobbies: hobbies || '',
            user_img: '',
            user_disability: disability || '',
            user_maritalstatus: maritalStatus || 'Never Married',
            user_has_kids: hasKids || 'No',
            user_children_count: childrenCount || 0,
            user_boys_count: boysCount || 0,
            user_girls_count: girlsCount || 0,
            user_children_names: childrenNames || null,
            user_whoyoustaywith: whoYouStayWith || '',
            user_whereyoubelong: whereYouBelong || '',
            plan_type: paymentId ? 'premium' : 'free',
            plan_expiry_date: paymentId ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
            diet: diet || '',
            smoking: smoking || 'Never',
            drinking: drinking || 'Never',
            about: about || '',
            caste: caste || ''
        };

        // Create user
        const userId = await User.create(userData);

        // Store partner preferences if provided
        if (Object.keys(partnerPreferences).length > 0) {
            await User.savePartnerPreferences(userId, {
                min_age: partnerPreferences.minAge || 21,
                max_age: partnerPreferences.maxAge || 35,
                preferred_religion: partnerPreferences.preferredReligion || '',
                preferred_location: partnerPreferences.preferredLocation || '',
                preferred_caste: partnerPreferences.preferredCaste || '',
                preferred_mother_tongue: partnerPreferences.preferredMotherTongue || '',
                preferred_education: partnerPreferences.preferredEducation || ''
            });
        }

        // Update payment info if payment successful
        if (paymentId) {
            await User.updatePaymentStatus(userId, paymentId, paymentAmount);
        }

        // Generate token
        const token = generateToken(userId);
        
        // Update last login
        await User.updateLastLogin(userId);

        res.status(201).json({
            success: true,
            message: paymentId ? 'User registered successfully with payment' : 'Registration successful! Please complete payment to activate your account.',
            token: token,
            requiresPayment: !paymentId,
            paymentAmount: 99,
            razorpayKey: process.env.RAZORPAY_KEY_ID || 'rzp_test_mYFRQUddrXZ4Uv',
            user: {
                id: userId,
                user_gen_id: user_gen_id,
                name: name,
                email: email,
                phone: mobileNumber,
                gender: gender,
                paymentStatus: paymentId ? 'completed' : 'pending'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Complete registration after payment
// @route   POST /api/users/complete-registration
const completeRegistration = async (req, res) => {
    try {
        const { userId, paymentId, paymentAmount = 99 } = req.body;
        
        if (!userId || !paymentId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and Payment ID are required'
            });
        }
        
        // Update user payment status
        await User.updatePaymentStatus(userId, paymentId, paymentAmount);
        
        // Activate user account
        await User.updateStatus(userId, 1);
        
        res.json({
            success: true,
            message: 'Payment completed and account activated successfully'
        });
    } catch (error) {
        console.error('Complete registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/users/login
const loginUser = async (req, res) => {
    try {
        const { email, mobileNumber, password } = req.body;
        
        const loginIdentifier = email || mobileNumber;

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/mobile number and password'
            });
        }

        let user;
        
        if (loginIdentifier.length === 10 && /^\d+$/.test(loginIdentifier)) {
            user = await User.findByMobileNumber(loginIdentifier);
        } else {
            user = await User.findByEmail(loginIdentifier);
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid mobile number/email or password'
            });
        }

        const isPasswordValid = (password === user.user_pass);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid mobile number/email or password'
            });
        }

        if (user.user_status !== 1) {
            return res.status(403).json({
                success: false,
                message: user.user_payment_status === 'pending' 
                    ? 'Please complete payment to activate your account' 
                    : 'Your account has been deactivated. Please contact support.'
            });
        }

        await User.updateLastLogin(user.user_id);
        const token = generateToken(user.user_id);

        delete user.user_pass;
        delete user.reset_token_hash;
        delete user.reset_token_expires_at;

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        delete user.user_pass;
        delete user.reset_token_hash;
        delete user.reset_token_expires_at;

        const formattedUser = {
            id: user.user_id,
            user_gen_id: user.user_gen_id,
            name: user.user_name || 'User',
            email: user.user_email || '',
            phone: user.user_phone || '',
            gender: user.user_gender || '',
            age: user.user_dob ? calculateAge(user.user_dob) : null,
            city: user.user_city || 'Unknown',
            state: user.user_state || 'India',
            religion: user.user_religion || '',
            maritalstatus: user.user_maritalstatus || '',
            profilePhoto: user.user_img || null,
            paymentStatus: user.user_payment_status,
            planType: user.plan_type,
            planExpiryDate: user.plan_expiry_date,
            address: {
                city: user.user_city || 'Unknown',
                state: user.user_state || 'India',
                country: user.user_country || 'India'
            }
        };

        res.json({
            success: true,
            user: formattedUser
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get matches for user
// @route   GET /api/auth/matches
const getMatches = async (req, res) => {
    try {
        const currentUser = await User.findById(req.userId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const oppositeGender = currentUser.user_gender === 'male' ? 'female' : 'male';
        
        const filters = {
            user_gender: oppositeGender,
            user_status: 1,
            user_payment_status: 'completed'
        };
        
        const result = await User.search(filters, 1, 20, req.userId);
        
        const matches = (result.users || []).map(user => ({
            _id: user.user_id,
            id: user.user_id,
            name: user.user_name || 'User',
            age: user.user_dob ? calculateAge(user.user_dob) : 25,
            city: user.user_city || 'Unknown',
            state: user.user_state || 'India',
            compatibility: Math.floor(Math.random() * 30) + 70,
            profilePhoto: user.user_img || null,
            address: {
                city: user.user_city || 'Unknown',
                state: user.user_state || 'India'
            }
        }));
        
        res.json({
            success: true,
            matches: matches
        });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get activities
// @route   GET /api/auth/activities
const getActivities = async (req, res) => {
    try {
        const activities = [
            { id: 1, text: 'Someone viewed your profile', time: '5 minutes ago', icon: 'eye-outline' },
            { id: 2, text: 'New match found!', time: '1 hour ago', icon: 'heart-circle-outline' },
            { id: 3, text: 'Interest received from Priya', time: '2 hours ago', icon: 'chatbubble-outline' },
            { id: 4, text: 'Your profile is getting more views', time: '1 day ago', icon: 'trending-up-outline' }
        ];
        
        res.json({
            success: true,
            activities: activities
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get user stats
// @route   GET /api/auth/stats
const getUserStats = async (req, res) => {
    try {
        const stats = {
            profileViews: Math.floor(Math.random() * 100) + 50,
            interests: Math.floor(Math.random() * 50) + 10,
            matches: Math.floor(Math.random() * 30) + 5,
            profileScore: Math.floor(Math.random() * 40) + 60
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Send interest
// @route   POST /api/auth/send-interest
const sendInterest = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Target user ID is required'
            });
        }
        
        // Save interest to database
        await User.sendInterest(req.userId, targetUserId);
        
        res.json({
            success: true,
            message: 'Interest sent successfully'
        });
    } catch (error) {
        console.error('Send interest error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get user profile by id
// @route   GET /api/users/profile/:id
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        delete user.user_pass;
        delete user.reset_token_hash;
        delete user.reset_token_expires_at;

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
    try {
        const updated = await User.update(req.userId, req.body);
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No changes made or invalid fields'
            });
        }

        const updatedUser = await User.findById(req.userId);
        delete updatedUser.user_pass;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Change password
// @route   PUT /api/users/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }
        
        const user = await User.findById(req.userId);
        const isPasswordValid = (currentPassword === user.user_pass);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const updated = await User.updatePassword(req.userId, newPassword);
        
        if (updated) {
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Search users
// @route   GET /api/users/search
const searchUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, ...filters } = req.query;
        const result = await User.search(filters, parseInt(page), parseInt(limit), req.userId);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }
        
        const user = await User.findById(req.userId);
        const isPasswordValid = (password === user.user_pass);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password is incorrect'
            });
        }

        const deleted = await User.delete(req.userId);
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete account'
            });
        }
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get shortlist
// @route   GET /api/users/shortlist
const getShortlist = async (req, res) => {
    try {
        const shortlist = await User.getShortlist(req.userId);
        
        res.json({
            success: true,
            shortlist: shortlist
        });
    } catch (error) {
        console.error('Get shortlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Add to shortlist
// @route   POST /api/users/shortlist
const addToShortlist = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Target user ID is required'
            });
        }
        
        const isShortlisted = await User.toggleShortlist(req.userId, targetUserId);
        
        res.json({
            success: true,
            message: isShortlisted ? 'Added to shortlist' : 'Removed from shortlist',
            isShortlisted: isShortlisted
        });
    } catch (error) {
        console.error('Shortlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Remove from shortlist
// @route   POST /api/users/remove-shortlist
const removeFromShortlist = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Target user ID is required'
            });
        }
        
        await User.removeFromShortlist(req.userId, targetUserId);
        
        res.json({
            success: true,
            message: 'Removed from shortlist'
        });
    } catch (error) {
        console.error('Remove from shortlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

module.exports = {
    registerUser,
    completeRegistration,
    createRazorpayOrder,
    verifyPayment,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    searchUsers,
    deleteAccount,
    getCurrentUser,
    getMatches,
    getActivities,
    getUserStats,
    sendInterest,
    calculateAge,
    getShortlist,
    removeFromShortlist,
    addToShortlist
};