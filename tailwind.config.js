module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#101114',
        paper: '#f6f7f9',
        line: '#e4e7ec',
        soft: '#eef1f5',
        muted: '#667085'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(16, 17, 20, 0.08)'
      }
    }
  },
  plugins: []
};
