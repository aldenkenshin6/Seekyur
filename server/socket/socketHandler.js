const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('newAlert', (alert) => {
        io.emit('receiveAlert', alert);
        });

        socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        });
    });
};

module.exports = socketHandler;