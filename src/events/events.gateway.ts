import { OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ACTIONS } from 'app.constants';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  userNameSocketIdMap = {};

  getAllConnectedClients(roomId: string) {
    // return Array of connected clients with socketId and username
    return Array.from(this.server.sockets.adapter.rooms.get(roomId) || []).map(
      (socketId) => {
        return { socketId, username: this.userNameSocketIdMap[socketId] };
      },
    );
  }

  @SubscribeMessage('join')
  onJoinEvent(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const { roomId, username } = data;
    this.userNameSocketIdMap[socket.id] = username;
    socket.join(roomId);
    const connectedClients = this.getAllConnectedClients(roomId);
    connectedClients.forEach((client) => {
      const clientSocketId = client.socketId;
      this.server.to(clientSocketId).emit(ACTIONS.JOINED, {
        connectedClients,
        socketId: socket.id,
        username,
      });
    });
  }
}
