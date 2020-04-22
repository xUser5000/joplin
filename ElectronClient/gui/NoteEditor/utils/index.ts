const { bridge } = require('electron').remote.require('./bridge');
const { reg } = require('lib/registry.js');
const { shim } = require('lib/shim');

export async function commandAttachFileToBody(body:string, filePaths:string[] = null, options:any = null) {
	options = {
		createFileURL: false,
		position: 0,
		...options,
	};

	if (!filePaths) {
		filePaths = bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return;
	}

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			reg.logger().info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, options.position, {
				createFileURL: options.createFileURL,
				resizeLargeImages: 'ask',
			});

			if (!newBody) {
				reg.logger().info('File attachment was cancelled');
				return null;
			}

			body = newBody;
			reg.logger().info('File was attached.');
		} catch (error) {
			reg.logger().error(error);
			bridge().showErrorMessageBox(error.message);
		}
	}

	return body;
}
