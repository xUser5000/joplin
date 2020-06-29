import { CommandDeclaration } from '../../lib/services/CommandService';
const { _ } = require('lib/locale');

const declaration:CommandDeclaration = {
	name: 'toggleNoteList',
	label: () => _('Toggle note list'),
	iconName: 'fa-align-justify',
};

export default declaration;
