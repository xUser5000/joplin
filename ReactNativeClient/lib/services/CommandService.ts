const BaseService = require('lib/services/BaseService');

export interface CommandRuntime {
	execute: Function
	isEnabled?():boolean
}

export interface CommandDeclaration {
	name: string
	label?():string,
	iconName?: string,
}

export interface Command {
	declaration: CommandDeclaration,
	runtime?: CommandRuntime,
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

interface CommandByNameOptions {
	mustExist?:boolean,
	runtimeMustBeRegistered?:boolean,
}

export default class CommandService extends BaseService {

	private static instance_:CommandService;

	static instance():CommandService {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_:Commands = {};

	initialize(store:any) {
		utils.store = store;
	}

	commandByName(name:string, options:CommandByNameOptions = null):Command {
		options = {
			mustExist: true,
			runtimeMustBeRegistered: false,
		};

		const command = this.commands_[name];

		if (!command) {
			if (options.mustExist) throw new Error(`No such command: ${name}`);
			return null;
		}

		if (options.runtimeMustBeRegistered && !command.runtime) throw new Error(`Runtime is not registered for command ${name}`);
		return command;
	}

	registerDeclaration(declaration:CommandDeclaration) {
		// if (this.commands_[declaration.name]) throw new Error(`There is already a command with name ${declaration.name}`);

		declaration = { ...declaration };
		if (!declaration.label) declaration.label = () => '';
		if (!declaration.iconName) declaration.iconName = '';

		// In TypeScript it's not an issue, but in JavaScript it's easy to accidentally set the label
		// to a string instead of a function, and it will cause strange errors that are hard to debug.
		// So here check early that we have the right type.
		if (typeof declaration.label !== 'function') throw new Error(`declaration.label must be a function: ${declaration.name}`);

		this.commands_[declaration.name] = {
			declaration: declaration,
		};
	}

	registerRuntime(commandName:string, runtime:CommandRuntime) {
		if (typeof commandName !== 'string') throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);

		const command = this.commandByName(commandName);
		// if (command.runtime) throw new Error(`Runtime is already registered for command: ${commandName}`);

		runtime = Object.assign({}, runtime);
		if (!runtime.isEnabled) runtime.isEnabled = () => true;
		command.runtime = runtime;
	}

	unregisterRuntime(commandName:string) {
		const command = this.commandByName(commandName, { mustExist: false });
		if (!command || !command.runtime) return; // throw new Error(`Trying to unregister a runtime that has not been registered: ${commandName}`);
		delete command.runtime;
	}

	execute(commandName:string, ...args:any[]) {
		const command = this.commandByName(commandName);
		if (!command.runtime.isEnabled()) return;
		command.runtime.execute(...args);
	}

	isEnabled(commandName:string):boolean {
		const command = this.commandByName(commandName, { runtimeMustBeRegistered: true });
		return command.runtime.isEnabled();
	}

	commandToToolbarButton(commandName:string, additionalOptions:any = null) {
		const command = this.commandByName(commandName, { runtimeMustBeRegistered: true });

		return {
			title: command.declaration.label(),
			iconName: command.declaration.iconName,
			enabled: command.runtime.isEnabled(),
			onClick: () => {
				command.runtime.execute();
			},
			...additionalOptions,
		};
	}

	commandToMenuItem(commandName:string, accelerator:string = null) {
		const command = this.commandByName(commandName);

		const item:any = {
			id: command.declaration.name,
			label: command.declaration.label(),
			click: () => {
				command.runtime.execute();
			},
		};

		if (accelerator) item.accelerator = accelerator;

		return item;
	}

	commandsEnabledState(previousState:any = null):any {
		const output:any = {};

		for (const name in this.commands_) {
			const command = this.commandByName(name);
			const enabled = command.runtime ? command.runtime.isEnabled() : false;
			if (!previousState || previousState[name] !== enabled) {
				output[name] = enabled;
			}
		}

		return output;
	}

}
