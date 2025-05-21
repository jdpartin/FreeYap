import { Server, Socket } from 'socket.io';

export default (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('A user connected:', socket.id);

        socket.on('offer', (offer) => {
            socket.broadcast.emit('offer', offer);
        });

        socket.on('answer', (answer) => {
            socket.broadcast.emit('answer', answer);
        });

        socket.on('ice-candidate', (candidate) => {
            socket.broadcast.emit('ice-candidate', candidate);
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
        });
    });
};
