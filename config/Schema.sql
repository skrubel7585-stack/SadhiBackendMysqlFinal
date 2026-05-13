-- Create tables for Hostinger database

-- Users table
CREATE TABLE IF NOT EXISTS `tbl_user` (
    `user_id` int(11) NOT NULL AUTO_INCREMENT,
    `user_gen_id` varchar(255) NOT NULL,
    `user_religion` varchar(255) NOT NULL,
    `user_name` text NOT NULL,
    `user_namecast` varchar(255) NOT NULL,
    `user_nameintercast` varchar(255) NOT NULL,
    `user_mother_tongue` varchar(255) DEFAULT NULL,
    `user_gender` varchar(255) NOT NULL,
    `user_phone` varchar(255) NOT NULL,
    `user_email` varchar(255) NOT NULL,
    `user_pass` varchar(255) NOT NULL,
    `plan_type` varchar(50) DEFAULT NULL,
    `plan_expiry_date` datetime DEFAULT NULL,
    `user_status` int(11) NOT NULL DEFAULT 1,
    `pending_data` text DEFAULT NULL,
    `has_pending_changes` tinyint(1) NOT NULL DEFAULT 0,
    `user_otp_status` int(11) NOT NULL DEFAULT 0,
    `user_payment_status` varchar(255) NOT NULL DEFAULT 'pending',
    `user_otp` int(11) NOT NULL DEFAULT 0,
    `user_city` text NOT NULL,
    `user_state` varchar(255) DEFAULT NULL,
    `user_country` varchar(255) DEFAULT NULL,
    `user_dob` date DEFAULT NULL,
    `user_height` varchar(255) NOT NULL,
    `user_weight` varchar(255) NOT NULL,
    `user_fatherName` text NOT NULL,
    `user_motherName` text NOT NULL,
    `user_create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `user_address` varchar(255) NOT NULL,
    `user_jobType` varchar(255) NOT NULL,
    `user_companyName` varchar(255) NOT NULL,
    `user_currentResident` text NOT NULL,
    `user_salary` varchar(255) NOT NULL,
    `user_degree` varchar(255) NOT NULL,
    `user_school` varchar(255) NOT NULL,
    `user_collage` varchar(255) NOT NULL,
    `user_hobbies` text NOT NULL,
    `user_img` varchar(255) NOT NULL,
    `user_disability` varchar(255) NOT NULL,
    `user_maritalstatus` varchar(255) NOT NULL,
    `user_has_kids` varchar(5) DEFAULT NULL,
    `user_children_count` tinyint(4) DEFAULT 0,
    `user_boys_count` tinyint(4) DEFAULT 0,
    `user_girls_count` tinyint(4) DEFAULT 0,
    `user_children_names` text DEFAULT NULL,
    `user_whoyoustaywith` varchar(255) NOT NULL,
    `user_whereyoubelong` varchar(255) NOT NULL,
    `reset_token_hash` varchar(64) DEFAULT NULL,
    `reset_token_expires_at` datetime DEFAULT NULL,
    `last_login` datetime DEFAULT NULL,
    `last_active` datetime DEFAULT NULL,
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `user_email_unique` (`user_email`),
    UNIQUE KEY `user_phone_unique` (`user_phone`),
    UNIQUE KEY `user_gen_id_unique` (`user_gen_id`),
    KEY `idx_user_status` (`user_status`),
    KEY `idx_user_gender` (`user_gender`),
    KEY `idx_user_city` (`user_city`(100)),
    KEY `idx_user_religion` (`user_religion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Admin table
CREATE TABLE IF NOT EXISTS `admin_tble` (
    `ad_id` int(11) NOT NULL AUTO_INCREMENT,
    `ad_name` varchar(255) NOT NULL,
    `ad_phone` varchar(20) NOT NULL,
    `ad_email` varchar(255) NOT NULL,
    `ad_img` varchar(500) DEFAULT NULL,
    `ad_pass` varchar(255) NOT NULL,
    `ad_status` tinyint(1) NOT NULL DEFAULT 1,
    `ad_create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_login` datetime DEFAULT NULL,
    `role` varchar(50) DEFAULT 'admin',
    PRIMARY KEY (`ad_id`),
    UNIQUE KEY `ad_email_unique` (`ad_email`),
    UNIQUE KEY `ad_phone_unique` (`ad_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Chat table
CREATE TABLE IF NOT EXISTS `chat_tble` (
    `chat_id` int(11) NOT NULL AUTO_INCREMENT,
    `chat_senderID` int(11) NOT NULL,
    `chat_receiverID` int(11) NOT NULL,
    `chat_profile_image` varchar(500) DEFAULT NULL,
    `chat_message` text NOT NULL,
    `interest_status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=Accepted, 2=Denied, 9=Regular Chat',
    `chat_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `is_read` tinyint(1) DEFAULT 0,
    `read_at` datetime DEFAULT NULL,
    `deleted_by_sender` tinyint(1) DEFAULT 0,
    `deleted_by_receiver` tinyint(1) DEFAULT 0,
    PRIMARY KEY (`chat_id`),
    KEY `idx_sender_receiver` (`chat_senderID`, `chat_receiverID`),
    KEY `idx_interest_status` (`interest_status`),
    KEY `idx_chat_date` (`chat_date`),
    FOREIGN KEY (`chat_senderID`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`chat_receiverID`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- User photos table
CREATE TABLE IF NOT EXISTS `user_photo` (
    `photo_id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `image_path` varchar(500) NOT NULL,
    `is_profile_picture` tinyint(1) NOT NULL DEFAULT 0,
    `approval_status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=Approved, 2=Rejected',
    `upload_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `rejection_reason` varchar(500) DEFAULT NULL,
    `approved_by` int(11) DEFAULT NULL,
    `approved_date` datetime DEFAULT NULL,
    PRIMARY KEY (`photo_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_approval_status` (`approval_status`),
    FOREIGN KEY (`user_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- User preferences/likes table
CREATE TABLE IF NOT EXISTS `user_likes` (
    `like_id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `liked_user_id` int(11) NOT NULL,
    `status` tinyint(1) DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`like_id`),
    UNIQUE KEY `unique_like` (`user_id`, `liked_user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`liked_user_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- User views table
CREATE TABLE IF NOT EXISTS `user_views` (
    `view_id` int(11) NOT NULL AUTO_INCREMENT,
    `viewer_id` int(11) NOT NULL,
    `viewed_user_id` int(11) NOT NULL,
    `view_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`view_id`),
    KEY `idx_viewed_user` (`viewed_user_id`),
    FOREIGN KEY (`viewer_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`viewed_user_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    `notif_id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `type` varchar(50) NOT NULL,
    `title` varchar(255) NOT NULL,
    `message` text NOT NULL,
    `is_read` tinyint(1) DEFAULT 0,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `data` json DEFAULT NULL,
    PRIMARY KEY (`notif_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_is_read` (`is_read`),
    FOREIGN KEY (`user_id`) REFERENCES `tbl_user`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default admin
INSERT INTO `admin_tble` (`ad_name`, `ad_phone`, `ad_email`, `ad_pass`, `ad_status`, `role`) 
VALUES ('Super Admin', '1234567890', 'admin@yourdomain.com', '$2a$10$YourHashedPasswordHere', 1, 'super_admin')
ON DUPLICATE KEY UPDATE ad_id=ad_id;