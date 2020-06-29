import { CommandDeclaration } from '../../lib/services/CommandService';
const { _ } = require('lib/locale');

const declaration:CommandDeclaration = {
	name: 'newNotebook',
	label: () => _('New notebook'),
	iconName: 'fa-file',
};

export default declaration;
