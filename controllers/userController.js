// Updated controller with Razorpay integration
const User = require('../models/User');
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
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_jwt_secret_key', {
        expiresIn: process.env.JWT_EXPIRE || '30d'
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
            amount: amount * 100,
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
            // Update payment status if user ID is available
            if (req.userId) {
                await User.updatePaymentStatus(req.userId, razorpay_payment_id, 99);
                await User.updateStatus(req.userId, 1);
            }
            
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

// @desc    Register new user
// @route   POST /api/users/register
const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            mobileNumber,
            password,
            gender,
            lookingFor,
            dateOfBirth,
            religion,
            caste,
            motherTongue,
            maritalStatus,
            hasKids,
            childrenCount,
            boysCount,
            girlsCount,
            childrenNames,
            whoYouStayWith,
            whereYouBelong,
            education,
            school,
            college,
            occupation,
            annualIncome,
            companyName,
            currentResident,
            address,
            height,
            weight,
            diet,
            smoking,
            drinking,
            hobbies,
            fatherName,
            motherName,
            disability,
            about,
            partnerPreferences = {},
            paymentId,
            paymentAmount = 99,
            paymentStatus = 'pending'
        } = req.body;

        // Validate required fields
        if (!name || !email || !mobileNumber || !password || !gender) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, email, mobileNumber, password, gender'
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

        // Prepare user data
        const userData = {
            user_gen_id,
            user_name: name,
            user_namecast: lookingFor || '',
            user_nameintercast: lookingFor || '',
            user_religion: religion || '',
            user_mother_tongue: motherTongue || '',
            user_gender: gender,
            user_phone: mobileNumber,
            user_email: email,
            user_pass: password,
            user_status: paymentId ? 1 : 0,
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
            user_degree: education || '',
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

        // Store partner preferences
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
            await User.updateStatus(userId, 1);
        }

        // Generate token
        const token = generateToken(userId);
        
        // Update last login
        await User.updateLastLogin(userId);

        res.status(201).json({
            success: true,
            message: paymentId ? 'User registered successfully with payment' : 'Registration successful! Please complete payment to activate your account.',
            token: token,
            userId: userId,
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
            message: 'Server error: ' + error.message
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
        
        await User.updatePaymentStatus(userId, paymentId, paymentAmount);
        await User.updateStatus(userId, 1);
        
        const token = generateToken(userId);
        
        res.json({
            success: true,
            message: 'Payment completed and account activated successfully',
            token: token
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
        const { mobileNumber, email, password } = req.body;
        
        // Check if either mobileNumber or email is provided
        const loginIdentifier = mobileNumber || email;

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide Mobile Number/Email and password'
            });
        }

        let user = null;
        
        // Check if loginIdentifier is mobile number (10 digits) or email
        const isMobileNumber = /^\d{10}$/.test(loginIdentifier);
        
        if (isMobileNumber) {
            // Search by mobile number
            user = await User.findByMobileNumber(loginIdentifier);
            console.log("🔍 Searching by mobile number:", loginIdentifier);
        } else {
            // Search by email
            user = await User.findByEmail(loginIdentifier);
            console.log("🔍 Searching by email:", loginIdentifier);
        }
        
        if (!user) {
            console.log("❌ User not found with identifier:", loginIdentifier);
            return res.status(401).json({
                success: false,
                message: 'Invalid Mobile Number/Email or password'
            });
        }

        console.log("✅ User found:", user.user_name, "User ID:", user.user_id);

        // Plain text password comparison
        const isPasswordValid = (password === user.user_pass);
        
        if (!isPasswordValid) {
            console.log("❌ Invalid password for user:", user.user_name);
            return res.status(401).json({
                success: false,
                message: 'Invalid Mobile Number/Email or password'
            });
        }

        // Check if user is active
        if (user.user_status !== 1) {
            console.log("⚠️ User account not active. Status:", user.user_status);
            return res.status(403).json({
                success: false,
                message: user.user_payment_status === 'pending' 
                    ? 'Please complete payment to activate your account' 
                    : 'Your account has been deactivated. Please contact support.'
            });
        }

        // Update last login
        await User.updateLastLogin(user.user_id);
        
        // Generate token
        const token = generateToken(user.user_id);

        // Remove sensitive data
        delete user.user_pass;

        // Send response
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.user_id,
                name: user.user_name,
                email: user.user_email,
                phone: user.user_phone,
                gender: user.user_gender,
                age: user.user_dob ? calculateAge(user.user_dob) : null,
                city: user.user_city,
                state: user.user_state,
                profilePicture: user.user_img,
                isPremium: user.plan_type === 'premium',
                isOnline: user.is_online || false,
                paymentStatus: user.user_payment_status
            }
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
// @route   GET /api/users/me
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

        res.json({
            success: true,
            user: {
                id: user.user_id,
                name: user.user_name,
                email: user.user_email,
                phone: user.user_phone,
                gender: user.user_gender,
                age: user.user_dob ? calculateAge(user.user_dob) : null,
                city: user.user_city,
                state: user.user_state,
                country: user.user_country,
                religion: user.user_religion,
                motherTongue: user.user_mother_tongue,
                maritalStatus: user.user_maritalstatus,
                occupation: user.user_jobType,
                education: user.user_degree,
                about: user.about,
                profilePicture: user.user_img,
                isPremium: user.plan_type === 'premium',
                isOnline: user.is_online || false,
                paymentStatus: user.user_payment_status
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:id
const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        console.log("🔍 Fetching profile for user ID:", userId);
        
        // For MySQL, convert to number if needed
        const numericId = parseInt(userId);
        
        const user = await User.findById(numericId);
        
        if (!user) {
            console.log("❌ User not found:", userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove password
        delete user.user_pass;
        
        console.log("✅ User found:", user.user_name);

        // Format response for frontend
        res.json({
            success: true,
            user: {
                _id: user.user_id,
                id: user.user_id,
                name: user.user_name,
                email: user.user_email,
                phone: user.user_phone,
                age: user.user_dob ? calculateAge(user.user_dob) : null,
                gender: user.user_gender,
                city: user.user_city || 'Not specified',
                state: user.user_state || 'Not specified',
                country: user.user_country || 'India',
                religion: user.user_religion || 'Not specified',
                motherTongue: user.user_mother_tongue || 'Not specified',
                maritalStatus: user.user_maritalstatus || 'Not specified',
                occupation: user.user_jobType || 'Not specified',
                education: user.user_degree || 'Not specified',
                about: user.about || user.user_address || 'No description provided',
                profilePicture: user.user_img || null,
                // isPremium: user.plan_type === 'premium',
                isOnline: user.is_online || false
            }
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
            user: updatedUser
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
            ...result
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
};

// @desc    Get matches for user
// @route   GET /api/users/matches
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
        
        const result = await User.search(filters, 1, 50, req.userId);
        
        console.log("📊 Search results count:", result.users?.length || 0);
        
        const matches = (result.users || []).map(user => {
            // ডিবাগ লগ - দেখুন user_img আসছে কিনা
            console.log(`👤 User: ${user.user_name}, user_img:`, user.user_img);
            
            // ইমেজ URL তৈরি করুন (সরাসরি full URL)
            let profileImageUrl = null;
            if (user.user_img) {
                // যদি ইমেজ পাথ থাকে
                if (user.user_img.startsWith('http')) {
                    profileImageUrl = user.user_img;
                } else {
                    profileImageUrl = `https://www.rishtonkamela.com/upload/${user.user_img}`;
                }
            } else {
                // ডিফল্ট avatar URL
                profileImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}&background=FF6B6B&color=fff&size=200&bold=true&length=2`;
            }
            
            return {
                _id: user.user_id,
                id: user.user_id,
                name: user.user_name,
                user_name: user.user_name,
                age: user.user_dob ? calculateAge(user.user_dob) : 25,
                user_age: user.user_dob ? calculateAge(user.user_dob) : 25,
                city: user.user_city || 'Unknown',
                user_city: user.user_city || 'Unknown',
                state: user.user_state || 'Unknown',
                user_state: user.user_state || 'Unknown',
                occupation: user.user_jobType || 'Professional',
                user_jobType: user.user_jobType || 'Professional',
                // এখানে সরাসরি full URL পাঠান
                profilePicture: profileImageUrl,
                user_img: profileImageUrl,
                compatibility: Math.floor(Math.random() * 30) + 70,
                isOnline: user.is_online || false,
                isPremium: user.plan_type === 'premium',
                matchedAt: user.user_create_date || new Date().toISOString(),
                about: user.about || user.user_address || "Looking for meaningful connections"
            };
        });
        
        console.log("✅ First match image URL:", matches[0]?.profilePicture);
        
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
// @route   GET /api/users/activities
const getActivities = async (req, res) => {
    try {
        const activities = [
            { id: 1, text: 'Someone viewed your profile', time: '5 minutes ago', icon: 'eye-outline' },
            { id: 2, text: 'New match found!', time: '1 hour ago', icon: 'heart-circle-outline' },
            { id: 3, text: 'Interest received from a user', time: '2 hours ago', icon: 'chatbubble-outline' },
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
// @route   GET /api/users/stats
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
// @route   POST /api/users/send-interest
const sendInterest = async (req, res) => {
    try {
        const { toUserId } = req.body;
        const fromUserId = req.userId;
        
        if (!toUserId) {
            return res.status(400).json({
                success: false,
                message: 'Target user ID is required'
            });
        }
        
        const result = await User.sendInterest(fromUserId, toUserId);
        
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

// @desc    Check interest status
// @route   GET /api/users/check-interest/:id
// const checkInterest = async (req, res) => {
//     try {
//         const toUserId = req.params.id;
//         const fromUserId = req.userId;
        
//         const query = `
//             SELECT id FROM interests 
//             WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
//         `;
        
//         const { promisePool } = require('../config/database');
//         const [rows] = await promisePool.execute(query, [fromUserId, toUserId]);
        
//         res.json({
//             success: true,
//             isInterested: rows.length > 0
//         });
//     } catch (error) {
//         console.error('Check interest error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error: ' + error.message
//         });
//     }
// };

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

// @desc    Check interest status
// @route   GET /api/users/check-interest/:id
const checkInterest = async (req, res) => {
    try {
        const toUserId = req.params.id;
        const fromUserId = req.userId;
        
        console.log("🔍 Checking interest - From:", fromUserId, "To:", toUserId);
        
        // Check if table exists, if not create it
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS interests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                from_user_id INT NOT NULL,
                to_user_id INT NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_interest (from_user_id, to_user_id),
                INDEX idx_from_user (from_user_id),
                INDEX idx_to_user (to_user_id)
            )
        `;
        
        const { promisePool } = require('../config/database');
        
        // Create table if not exists
        await promisePool.execute(createTableQuery);
        
        // Check interest
        const query = `
            SELECT id FROM interests 
            WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'
        `;
        
        const [rows] = await promisePool.execute(query, [fromUserId, toUserId]);
        
        console.log("Interest exists:", rows.length > 0);
        
        res.json({
            success: true,
            isInterested: rows.length > 0
        });
    } catch (error) {
        console.error('Error checking interest:', error);
        res.status(500).json({
            success: false,
            message: error.message
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
    checkInterest,
    calculateAge,
    getShortlist,
    removeFromShortlist,
    addToShortlist
};