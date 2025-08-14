import db from '../../config/db.js';

export const registerClient = (req, res) => {
  const { uid, email } = req.user;
  

  db.query(
    'INSERT INTO users (email) VALUES (?)',
    [email],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'User already exists' });
        }
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: 'Client registered successfully' });
    }
  );
};
