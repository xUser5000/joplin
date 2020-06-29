import CommandService from '../services/CommandService';
const { _ } = require('lib/locale');

export default {
	name: 'newTodo',
	label: () => _('New to-do'),
	iconName: 'fa-check-square',
	execute: async (template:string = null) => {
		return CommandService.instance().execute('newNote', template, true);
	},
	isEnabled: () => {
		return CommandService.instance().commandByName('newNote').isEnabled();
	},
};
