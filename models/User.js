// models/User.js
const { promisePool } = require("../config/database");

class User {
  // Create new user - Plain text password (NO HASHING)
  static async create(userData) {
    const {
      user_gen_id,
      user_religion,
      user_name,
      user_namecast,
      user_nameintercast,
      user_mother_tongue,
      user_gender,
      user_phone,
      user_email,
      user_pass,
      user_city,
      user_state,
      user_country,
      user_dob,
      user_height,
      user_weight,
      user_fatherName,
      user_motherName,
      user_address,
      user_jobType,
      user_companyName,
      user_currentResident,
      user_salary,
      user_degree,
      user_school,
      user_collage,
      user_hobbies,
      user_img,
      user_disability,
      user_maritalstatus,
      user_has_kids,
      user_children_count,
      user_boys_count,
      user_girls_count,
      user_children_names,
      user_whoyoustaywith,
      user_whereyoubelong,
      plan_type = 'free',
      plan_expiry_date = null,
      diet = '',
      smoking = 'Never',
      drinking = 'Never',
      about = '',
      caste = ''
    } = userData;

    // Store password as plain text (NO HASHING)
    const plainTextPassword = user_pass;

    const query = `
      INSERT INTO tbl_user (
        user_gen_id, user_religion, user_name, user_namecast,
        user_nameintercast, user_mother_tongue, user_gender,
        user_phone, user_email, user_pass, user_city, user_state,
        user_country, user_dob, user_height, user_weight,
        user_fatherName, user_motherName, user_address,
        user_jobType, user_companyName, user_currentResident,
        user_salary, user_degree, user_school, user_collage,
        user_hobbies, user_img, user_disability, user_maritalstatus,
        user_has_kids, user_children_count, user_boys_count,
        user_girls_count, user_children_names, user_whoyoustaywith,
        user_whereyoubelong, user_status, user_otp_status,
        user_payment_status, user_otp, has_pending_changes,
        plan_type, plan_expiry_date, diet, smoking, drinking, about, caste
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, '0', 0, 0, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user_gen_id, user_religion, user_name, user_namecast,
      user_nameintercast, user_mother_tongue, user_gender,
      user_phone, user_email, plainTextPassword, user_city, user_state,
      user_country, user_dob, user_height, user_weight,
      user_fatherName, user_motherName, user_address,
      user_jobType, user_companyName, user_currentResident,
      user_salary, user_degree, user_school, user_collage,
      user_hobbies, user_img, user_disability, user_maritalstatus,
      user_has_kids, user_children_count, user_boys_count,
      user_girls_count, user_children_names, user_whoyoustaywith,
      user_whereyoubelong,
      plan_type, plan_expiry_date, diet, smoking, drinking, about, caste
    ];

    const [result] = await promisePool.execute(query, values);
    return result.insertId;
  }

  // Save partner preferences
  static async savePartnerPreferences(userId, preferences) {
    try {
      // Check if partner_preferences table exists, if not create it
      await this.createPartnerPreferencesTable();
      
      const query = `
        INSERT INTO partner_preferences 
        (user_id, min_age, max_age, preferred_religion, preferred_location, 
         preferred_caste, preferred_mother_tongue, preferred_education) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        min_age = VALUES(min_age),
        max_age = VALUES(max_age),
        preferred_religion = VALUES(preferred_religion),
        preferred_location = VALUES(preferred_location),
        preferred_caste = VALUES(preferred_caste),
        preferred_mother_tongue = VALUES(preferred_mother_tongue),
        preferred_education = VALUES(preferred_education)
      `;
      
      const [result] = await promisePool.execute(query, [
        userId, 
        preferences.min_age || 21, 
        preferences.max_age || 35, 
        preferences.preferred_religion || '', 
        preferences.preferred_location || '',
        preferences.preferred_caste || '',
        preferences.preferred_mother_tongue || '',
        preferences.preferred_education || ''
      ]);
      
      return result;
    } catch (error) {
      console.error("Error saving partner preferences:", error);
      throw error;
    }
  }

  // Create partner_preferences table if not exists
  static async createPartnerPreferencesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS partner_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        min_age INT DEFAULT 21,
        max_age INT DEFAULT 35,
        preferred_religion VARCHAR(255),
        preferred_location TEXT,
        preferred_caste VARCHAR(255),
        preferred_mother_tongue VARCHAR(255),
        preferred_education VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      )
    `;
    
    try {
      await promisePool.execute(query);
      console.log("Partner preferences table created/verified");
    } catch (error) {
      console.error("Error creating partner_preferences table:", error);
    }
  }

  // Get partner preferences
  static async getPartnerPreferences(userId) {
    try {
      const query = "SELECT * FROM partner_preferences WHERE user_id = ?";
      const [rows] = await promisePool.execute(query, [userId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error getting partner preferences:", error);
      return null;
    }
  }

  // Update payment status
  static async updatePaymentStatus(userId, paymentId, amount) {
    try {
      const query = `
        UPDATE tbl_user SET 
        user_payment_status = '1',
        plan_type = 'premium',
        plan_expiry_date = DATE_ADD(NOW(), INTERVAL 1 YEAR),
        user_status = 1,
        payment_id = ?,
        payment_amount = ?,
        payment_date = NOW()
        WHERE user_id = ?
      `;
      
      const [result] = await promisePool.execute(query, [paymentId, amount, userId]);
      return result;
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  }

  // Update user status
  static async updateStatus(userId, status) {
    try {
      const query = "UPDATE tbl_user SET user_status = ? WHERE user_id = ?";
      const [result] = await promisePool.execute(query, [status, userId]);
      return result;
    } catch (error) {
      console.error("Error updating user status:", error);
      throw error;
    }
  }

  // Send interest
  static async sendInterest(fromUserId, toUserId) {
    try {
      // Create interests table if not exists
      await this.createInterestsTable();
      
      const query = `
        INSERT INTO interests (from_user_id, to_user_id, status, created_at) 
        VALUES (?, ?, 'pending', NOW())
        ON DUPLICATE KEY UPDATE 
        status = 'pending',
        updated_at = NOW()
      `;
      
      const [result] = await promisePool.execute(query, [fromUserId, toUserId]);
      return result;
    } catch (error) {
      console.error("Error sending interest:", error);
      throw error;
    }
  }

  // Create interests table
  static async createInterestsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS interests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_user_id INT NOT NULL,
        to_user_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_interest (from_user_id, to_user_id),
        INDEX idx_from_user (from_user_id),
        INDEX idx_to_user (to_user_id),
        FOREIGN KEY (from_user_id) REFERENCES tbl_user(user_id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES tbl_user(user_id) ON DELETE CASCADE
      )
    `;
    
    try {
      await promisePool.execute(query);
      console.log("Interests table created/verified");
    } catch (error) {
      console.error("Error creating interests table:", error);
    }
  }

  // Get interests received
  static async getInterestsReceived(userId) {
    try {
      const query = `
        SELECT i.*, u.user_name, u.user_city, u.user_state, u.user_img, u.user_dob
        FROM interests i
        JOIN tbl_user u ON i.from_user_id = u.user_id
        WHERE i.to_user_id = ? AND i.status = 'pending'
        ORDER BY i.created_at DESC
      `;
      
      const [rows] = await promisePool.execute(query, [userId]);
      return rows;
    } catch (error) {
      console.error("Error getting interests received:", error);
      return [];
    }
  }

  // Get interests sent
  static async getInterestsSent(userId) {
    try {
      const query = `
        SELECT i.*, u.user_name, u.user_city, u.user_state, u.user_img, u.user_dob
        FROM interests i
        JOIN tbl_user u ON i.to_user_id = u.user_id
        WHERE i.from_user_id = ?
        ORDER BY i.created_at DESC
      `;
      
      const [rows] = await promisePool.execute(query, [userId]);
      return rows;
    } catch (error) {
      console.error("Error getting interests sent:", error);
      return [];
    }
  }

  // Update interest status
  static async updateInterestStatus(interestId, status) {
    try {
      const query = "UPDATE interests SET status = ? WHERE id = ?";
      const [result] = await promisePool.execute(query, [status, interestId]);
      return result;
    } catch (error) {
      console.error("Error updating interest status:", error);
      throw error;
    }
  }

  // Toggle shortlist
  static async toggleShortlist(userId, targetUserId) {
    try {
      // Create shortlist table if not exists
      await this.createShortlistTable();
      
      const [existing] = await promisePool.execute(
        'SELECT id FROM shortlist WHERE user_id = ? AND target_user_id = ?',
        [userId, targetUserId]
      );
      
      let isShortlisted = false;
      
      if (existing.length > 0) {
        await promisePool.execute(
          'DELETE FROM shortlist WHERE user_id = ? AND target_user_id = ?',
          [userId, targetUserId]
        );
        isShortlisted = false;
      } else {
        await promisePool.execute(
          'INSERT INTO shortlist (user_id, target_user_id, created_at) VALUES (?, ?, NOW())',
          [userId, targetUserId]
        );
        isShortlisted = true;
      }
      
      return isShortlisted;
    } catch (error) {
      console.error("Error toggling shortlist:", error);
      throw error;
    }
  }

  // Create shortlist table
  static async createShortlistTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS shortlist (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        target_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_shortlist (user_id, target_user_id),
        INDEX idx_user (user_id),
        INDEX idx_target (target_user_id),
        FOREIGN KEY (user_id) REFERENCES tbl_user(user_id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES tbl_user(user_id) ON DELETE CASCADE
      )
    `;
    
    try {
      await promisePool.execute(query);
      console.log("Shortlist table created/verified");
    } catch (error) {
      console.error("Error creating shortlist table:", error);
    }
  }

  // Get shortlist
  static async getShortlist(userId) {
    try {
      const query = `
        SELECT u.user_id, u.user_name, u.user_dob, u.user_city, u.user_state, 
               u.user_jobType, u.user_img, u.plan_type, u.user_gender,
               s.created_at as shortlisted_at,
               TIMESTAMPDIFF(YEAR, u.user_dob, CURDATE()) as age
        FROM shortlist s
        JOIN tbl_user u ON s.target_user_id = u.user_id
        WHERE s.user_id = ? AND u.user_status = 1
        ORDER BY s.created_at DESC
      `;
      
      const [rows] = await promisePool.execute(query, [userId]);
      return rows;
    } catch (error) {
      console.error("Error getting shortlist:", error);
      return [];
    }
  }

  // Remove from shortlist
  static async removeFromShortlist(userId, targetUserId) {
    try {
      const query = 'DELETE FROM shortlist WHERE user_id = ? AND target_user_id = ?';
      const [result] = await promisePool.execute(query, [userId, targetUserId]);
      return result;
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      throw error;
    }
  }

  // Check if user is in shortlist
  static async isInShortlist(userId, targetUserId) {
    try {
      const [rows] = await promisePool.execute(
        'SELECT id FROM shortlist WHERE user_id = ? AND target_user_id = ?',
        [userId, targetUserId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("Error checking shortlist:", error);
      return false;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = "SELECT * FROM tbl_user WHERE user_email = ?";
      const [rows] = await promisePool.execute(query, [email]);
      return rows[0];
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  // Find user by phone
  static async findByPhone(phone) {
    try {
      const query = "SELECT * FROM tbl_user WHERE user_phone = ?";
      const [rows] = await promisePool.execute(query, [phone]);
      return rows[0];
    } catch (error) {
      console.error("Error finding user by phone:", error);
      throw error;
    }
  }

  // Find user by mobile number
  static async findByMobileNumber(mobileNumber) {
    try {
      const [rows] = await promisePool.execute(
        "SELECT * FROM tbl_user WHERE user_phone = ? LIMIT 1",
        [mobileNumber]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding user by mobile:", error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const query = `
        SELECT * FROM tbl_user WHERE user_id = ?
      `;
      const [rows] = await promisePool.execute(query, [userId]);
      
      if (!rows[0]) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  // Update user
  static async update(userId, updateData) {
    const allowedFields = [
      "user_name", "user_religion", "user_mother_tongue", "user_city",
      "user_state", "user_country", "user_height", "user_weight",
      "user_jobType", "user_companyName", "user_currentResident",
      "user_salary", "user_degree", "user_school", "user_collage",
      "user_hobbies", "user_img", "user_maritalstatus", "user_address",
      "user_fatherName", "user_motherName", "user_has_kids",
      "user_children_count", "user_boys_count", "user_girls_count",
      "user_children_names", "user_whoyoustaywith", "user_whereyoubelong",
      "user_namecast", "user_nameintercast", "diet", "smoking", "drinking", "about", "caste"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) return false;

    values.push(userId);
    const query = `UPDATE tbl_user SET ${updates.join(", ")} WHERE user_id = ?`;
    const [result] = await promisePool.execute(query, values);
    return result.affectedRows > 0;
  }

  // Update password - Plain text
  static async updatePassword(userId, newPassword) {
    try {
      const query = "UPDATE tbl_user SET user_pass = ? WHERE user_id = ?";
      const [result] = await promisePool.execute(query, [newPassword, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(userId) {
    try {
      const query = "UPDATE tbl_user SET last_login = NOW() WHERE user_id = ?";
      const [result] = await promisePool.execute(query, [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      if (error.code === "ER_BAD_FIELD_ERROR") {
        console.log("last_login column not found, skipping update");
        return true;
      }
      console.error("Error updating last login:", error);
      return false;
    }
  }

  // Update last active
  static async updateLastActive(userId) {
    try {
      const query = "UPDATE tbl_user SET last_active = NOW() WHERE user_id = ?";
      const [result] = await promisePool.execute(query, [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating last active:", error);
      return false;
    }
  }

  // Delete user
  static async delete(userId) {
    try {
      // Delete related data first
      await promisePool.execute("DELETE FROM shortlist WHERE user_id = ? OR target_user_id = ?", [userId, userId]);
      await promisePool.execute("DELETE FROM interests WHERE from_user_id = ? OR to_user_id = ?", [userId, userId]);
      await promisePool.execute("DELETE FROM partner_preferences WHERE user_id = ?", [userId]);
      
      const query = "DELETE FROM tbl_user WHERE user_id = ?";
      const [result] = await promisePool.execute(query, [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Search users
  static async search(filters = {}, page = 1, limit = 20, currentUserId = null) {
    let query = "SELECT u.*, TIMESTAMPDIFF(YEAR, u.user_dob, CURDATE()) as age FROM tbl_user u WHERE u.user_status = 1 AND u.user_payment_status = '1' ";
    const values = [];

    if (currentUserId) {
      query += "AND u.user_id != ? ";
      values.push(currentUserId);
    }

    if (filters.user_gender) {
      query += "AND u.user_gender = ? ";
      values.push(filters.user_gender);
    }
    if (filters.user_religion) {
      query += "AND u.user_religion = ? ";
      values.push(filters.user_religion);
    }
    if (filters.user_city) {
      query += "AND u.user_city LIKE ? ";
      values.push(`%${filters.user_city}%`);
    }
    if (filters.user_state) {
      query += "AND u.user_state = ? ";
      values.push(filters.user_state);
    }
    if (filters.user_maritalstatus) {
      query += "AND u.user_maritalstatus = ? ";
      values.push(filters.user_maritalstatus);
    }
    if (filters.user_jobType) {
      query += "AND u.user_jobType = ? ";
      values.push(filters.user_jobType);
    }
    if (filters.user_degree) {
      query += "AND u.user_degree = ? ";
      values.push(filters.user_degree);
    }
    if (filters.user_has_kids) {
      query += "AND u.user_has_kids = ? ";
      values.push(filters.user_has_kids);
    }
    if (filters.min_age && filters.max_age) {
      query += "AND TIMESTAMPDIFF(YEAR, u.user_dob, CURDATE()) BETWEEN ? AND ? ";
      values.push(filters.min_age, filters.max_age);
    }
    if (filters.min_height && filters.max_height) {
      query += "AND CAST(SUBSTRING_INDEX(u.user_height, ' ', 1) AS UNSIGNED) BETWEEN ? AND ? ";
      values.push(filters.min_height, filters.max_height);
    }
    if (filters.min_salary && filters.max_salary) {
      query += 'AND CAST(REPLACE(REPLACE(u.user_salary, ",", ""), "Lakhs", "") AS UNSIGNED) BETWEEN ? AND ? ';
      values.push(filters.min_salary, filters.max_salary);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
    const [countResult] = await promisePool.execute(countQuery, values);
    const total = countResult[0].total;

    // Add sorting
    const sortBy = filters.sort_by || "user_id";
    const sortOrder = filters.sort_order || "DESC";
    query += `ORDER BY u.${sortBy} ${sortOrder} `;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += "LIMIT ? OFFSET ?";
    values.push(parseInt(limit), offset);

    const [rows] = await promisePool.execute(query, values);

    // Remove sensitive data
    rows.forEach((user) => {
      delete user.user_pass;
      delete user.reset_token_hash;
      delete user.reset_token_expires_at;
    });

    return {
      users: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  // Get suggested matches based on preferences
  static async getSuggestedMatches(userId, limit = 20) {
    try {
      const currentUser = await this.findById(userId);
      if (!currentUser) return [];
      
      const oppositeGender = currentUser.user_gender === 'male' ? 'female' : 'male';
      
      const query = `
        SELECT u.*, TIMESTAMPDIFF(YEAR, u.user_dob, CURDATE()) as age,
               pp.preferred_religion, pp.preferred_location,
               CASE 
                 WHEN u.user_city = ? THEN 30
                 WHEN u.user_state = ? THEN 20
                 ELSE 10
               END as location_score
        FROM tbl_user u
        LEFT JOIN partner_preferences pp ON u.user_id = pp.user_id
        WHERE u.user_gender = ? 
          AND u.user_status = 1 
          AND u.user_payment_status = 'completed'
          AND u.user_id != ?
        ORDER BY location_score DESC, u.user_create_date DESC
        LIMIT ?
      `;
      
      const [rows] = await promisePool.execute(query, [
        currentUser.user_city, currentUser.user_state,
        oppositeGender, userId, limit
      ]);
      
      rows.forEach((user) => {
        delete user.user_pass;
      });
      
      return rows;
    } catch (error) {
      console.error("Error getting suggested matches:", error);
      return [];
    }
  }

  // Get dashboard statistics
  static async getStats() {
    const queries = {
      totalUsers: "SELECT COUNT(*) as count FROM tbl_user WHERE user_status = 1",
      totalMale: 'SELECT COUNT(*) as count FROM tbl_user WHERE user_gender = "male" AND user_status = 1',
      totalFemale: 'SELECT COUNT(*) as count FROM tbl_user WHERE user_gender = "female" AND user_status = 1',
      newToday: "SELECT COUNT(*) as count FROM tbl_user WHERE DATE(user_create_date) = CURDATE()",
      totalChats: "SELECT COUNT(*) as count FROM chat_tble",
      activeUsers: "SELECT COUNT(*) as count FROM tbl_user WHERE last_active > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
      premiumUsers: "SELECT COUNT(*) as count FROM tbl_user WHERE plan_type = 'premium' AND plan_expiry_date > NOW()",
      pendingPayments: "SELECT COUNT(*) as count FROM tbl_user WHERE user_payment_status = 'pending'",
    };

    const stats = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const [rows] = await promisePool.execute(query);
        stats[key] = rows[0]?.count || 0;
      } catch (error) {
        console.error(`Error fetching ${key}:`, error.message);
        stats[key] = 0;
      }
    }
    return stats;
  }
}

module.exports = User;