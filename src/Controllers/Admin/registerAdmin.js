import db from '../../config/db.js';

export const registerAdmin = (req, res) => {
  const { email } = req.user; 

  db.query(
    'INSERT INTO admins (email) VALUES (?)',
    [email],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Admin already exists' });
        }
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: 'Admin registered successfully' });
    }
  );
};
