# graphql-servicebus-queues
A GraphQL subscriptions library for Azure Service Bus Queues - a cheaper alternative to using Service Bus Topic/Subscriptions.

Due to the nature of Service Bus queue clients being competing consumers, only a single instance/replica of a GraphQL API can be used with this library. Running multiple instances may result in messages not reaching the user agents that have subscribed to a particular GraphQL subscription. If multiple instances are required, consider using a library that supports Service Bus Topics/Subscriptions.


[![Build](https://github.com/photomoose/graphql-servicebus-queues/actions/workflows/build.yaml/badge.svg)](https://github.com/photomoose/graphql-servicebus-queues/actions/workflows/build.yaml)

[![npm version](https://badge.fury.io/js/graphql-servicebus-queues.svg)](https://badge.fury.io/js/graphql-servicebus-queues)

## Usage

```ts
const serviceBusQueue = new ServiceBusQueue({
  queueName: '[QUEUE NAME]',
  connectionString: '[CONNECTION STRING]',
  eventNameKey: '[MESSAGE PROPERTY NAME]',
});

const resolvers = {
  Subscription: {
    telemetry: {
       subscribe: () => ({
          [Symbol.asyncIterator]: () => serviceBusQueue.asyncIterator(['[EVENT NAME]']),
       }),
    }
  }
}
```

| Property | Description                                                 |
|----------|-------------------------------------------------------------|
 |queueName| The name of the Service Bus queue to receive messages from. |
| connectionString| The Service Bus connection string to connect to the queue.|
|eventNameKey| The name of the Service Bus message property whose value indicates the event type of the message. Messages are delivered to a GraphQL subscription if the value of the message property matches the event label provided in the GraphQL subscription resolver (i.e. if value of the message property named`MESSAGE PROPERTY NAME` equals `EVENT NAME`). 

## Detach Forced Error

Depending on message activity, the following error message may occur if no messages have been received from Service Bus over a period of time. This is normal behaviour and can be safely ignored. See the Service Bus [documentation](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-amqp-troubleshoot#link-is-closed) for more details.

```
amqp:link:detach-forced:The link 'G2:7223832:user.tenant0.cud_00000000000-0000-0000-0000-00000000000000' is force detached by the broker due to errors occurred in publisher(link164614). Detach origin: AmqpMessagePublisher.IdleTimerExpired: Idle timeout: 00:10:00. TrackingId:00000000000000000000000000000000000000_G2_B3, SystemTracker:mynamespace:Topic:MyTopic, Timestamp:2/16/2018 11:10:40 PM
```