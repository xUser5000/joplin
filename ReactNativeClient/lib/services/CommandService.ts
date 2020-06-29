const BaseService = require('lib/services/BaseService');

export interface Command {
	name: string
	label?():string,
	execute: Function
	isEnabled?():boolean
	iconName?: string,
}

interface Commands {
	[key:string]: Command;
}

interface ReduxStore {
	dispatch(action:any):void;
	getState():any;
}

interface Utils {
	store: ReduxStore;
}

export const utils:Utils = {
	store: {
		dispatch: () => {},
		getState: () => {},
	},
};

export default class CommandService extends BaseService {

	private static instance_:CommandService;

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_:Commands = {};

	initialize(store:any) {
		utils.store = store;
	}

	commandByName(name:string) {
		const command = this.commands_[name];
		if (!command) throw new Error(`No such command: ${name}`);
		return command;
	}

	register(command:Command) {
		if (this.commands_[command.name]) throw new Error(`There is already a command with name ${command.name}`);

		command = Object.assign({}, command);
		if (!command.isEnabled) command.isEnabled = () => true;
		if (!command.label) command.label = () => '';
		if (!command.iconName) command.iconName = '';
		this.commands_[command.name] = command;
	}

	execute(commandName:string, ...args:any[]) {
		const command = this.commandByName(commandName);
		if (!command.isEnabled()) return;
		command.execute(...args);
	}

	commandToToolbarButton(commandName:string) {
		const command = this.commandByName(commandName);

		return {
			title: command.label(),
			iconName: command.iconName,
			enabled: command.isEnabled(),
			onClick: () => {
				command.execute();
			},
		};
	}

	commandToMenuItem(commandName:string, accelerator:string = null) {
		const command = this.commandByName(commandName);

		const item:any = {
			id: command.name,
			label: command.label(),
			click: () => {
				command.execute();
			},
		};

		if (accelerator) item.accelerator = accelerator;

		return item;
	}

	commandsEnabledState(previousState:any = null):any {
		const output:any = {};

		for (const name in this.commands_) {
			const command = this.commands_[name];
			const enabled = command.isEnabled();
			if (!previousState || previousState[name] !== enabled) {
				output[name] = enabled;
			}
		}

		return output;
	}

}
