import { PubSubEngine } from "graphql-subscriptions";
import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusSender,
} from "@azure/service-bus";

export interface IServiceBusQueueOptions {
  connectionString: string;
  queueName: string;
  eventNameKey: string;
}

type SubscriptionInfo = {
  onMessage: Function;
  eventName: string;
};

export class ServiceBusQueue extends PubSubEngine {
  private client: ServiceBusClient;
  private handlerMap = new Map<number, SubscriptionInfo>();
  private options: IServiceBusQueueOptions;
  private currentClientId: number;
  private closeReceiver: { close(): Promise<void> } | undefined;
  private receiver: ServiceBusReceiver;
  private sender: ServiceBusSender;

  constructor(options: IServiceBusQueueOptions) {
    super();
    this.options = options;
    this.client = new ServiceBusClient(options.connectionString);
    this.currentClientId = 0;
    this.receiver = this.client.createReceiver(this.options.queueName);
    this.sender = this.client.createSender(this.options.queueName);
  }

  async subscribe(eventName: string, onMessage: Function, options: Object) {
    const processMessage = async (message: ServiceBusReceivedMessage) => {
      const receivedMessageEventName =
        message.applicationProperties?.[this.options.eventNameKey];
      console.log(
        `Received '${receivedMessageEventName}' message from Service Bus`
      );

      this.handlerMap.forEach((subscriptionInfo, subscriptionId) => {
        if (receivedMessageEventName === subscriptionInfo.eventName) {
          subscriptionInfo.onMessage(message.body);
          console.log(
            `Sent '${receivedMessageEventName}' message to GraphQL subscription id '${subscriptionId}'`
          );
        }
      });
    };

    const processError = async (args: ProcessErrorArgs) => {
      console.error(args.error);
    };

    const subscriptionId = this.currentClientId++;

    if (!this.closeReceiver) {
      this.closeReceiver = this.receiver.subscribe({
        processMessage: processMessage,
        processError: processError,
      });
      console.log("Listening for messages from Service Bus");
    }

    this.handlerMap.set(subscriptionId, {
      onMessage: onMessage,
      eventName: eventName,
    });

    console.log(
      `GraphQL subscription id '${subscriptionId}' has subscribed to event '${eventName}'`
    );

    return subscriptionId;
  }

  async unsubscribe(subscriptionId: number) {
    const subscriptionInfo = this.handlerMap.get(subscriptionId) || undefined;
    if (subscriptionInfo === undefined) {
      return;
    }
    this.handlerMap.delete(subscriptionId);
    console.log(`Subscription id ${subscriptionId} has unsubscribed`);

    if (!this.handlerMap.size && this.closeReceiver) {
      await this.closeReceiver.close();
      this.closeReceiver = undefined;
      console.log("Stopped listening for messages from Service Bus");
    }
  }

  async publish(eventName: string, payload: any): Promise<void> {
    await this.sender.sendMessages({
      body: payload,
      applicationProperties: {
        [this.options.eventNameKey]: eventName,
      },
    });

    console.log(`Published event '${eventName}' to Service Bus`);
  }
}
