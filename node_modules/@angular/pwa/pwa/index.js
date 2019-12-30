"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const rxjs_1 = require("rxjs");
const stream_1 = require("stream");
const RewritingStream = require('parse5-html-rewriting-stream');
function getWorkspace(host) {
    const possibleFiles = ['/angular.json', '/.angular.json'];
    const path = possibleFiles.filter(path => host.exists(path))[0];
    const configBuffer = host.read(path);
    if (configBuffer === null) {
        throw new schematics_1.SchematicsException(`Could not find (${path})`);
    }
    const content = configBuffer.toString();
    return {
        path,
        workspace: core_1.parseJson(content, core_1.JsonParseMode.Loose),
    };
}
function updateIndexFile(path) {
    return (host) => {
        const buffer = host.read(path);
        if (buffer === null) {
            throw new schematics_1.SchematicsException(`Could not read index file: ${path}`);
        }
        const rewriter = new RewritingStream();
        let needsNoScript = true;
        rewriter.on('startTag', (startTag) => {
            if (startTag.tagName === 'noscript') {
                needsNoScript = false;
            }
            rewriter.emitStartTag(startTag);
        });
        rewriter.on('endTag', (endTag) => {
            if (endTag.tagName === 'head') {
                rewriter.emitRaw('  <link rel="manifest" href="manifest.json">\n');
                rewriter.emitRaw('  <meta name="theme-color" content="#1976d2">\n');
            }
            else if (endTag.tagName === 'body' && needsNoScript) {
                rewriter.emitRaw('  <noscript>Please enable JavaScript to continue using this application.</noscript>\n');
            }
            rewriter.emitEndTag(endTag);
        });
        return new rxjs_1.Observable(obs => {
            const input = new stream_1.Readable({
                encoding: 'utf8',
                read() {
                    this.push(buffer);
                    this.push(null);
                },
            });
            const chunks = [];
            const output = new stream_1.Writable({
                write(chunk, encoding, callback) {
                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk);
                    callback();
                },
                final(callback) {
                    const full = Buffer.concat(chunks);
                    host.overwrite(path, full.toString());
                    callback();
                    obs.next(host);
                    obs.complete();
                },
            });
            input.pipe(rewriter).pipe(output);
        });
    };
}
function default_1(options) {
    return (host, context) => {
        if (!options.title) {
            options.title = options.project;
        }
        const { path: workspacePath, workspace } = getWorkspace(host);
        if (!options.project) {
            throw new schematics_1.SchematicsException('Option "project" is required.');
        }
        const project = workspace.projects[options.project];
        if (!project) {
            throw new schematics_1.SchematicsException(`Project is not defined in this workspace.`);
        }
        if (project.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`PWA requires a project type of "application".`);
        }
        // Find all the relevant targets for the project
        const projectTargets = project.targets || project.architect;
        if (!projectTargets || Object.keys(projectTargets).length === 0) {
            throw new schematics_1.SchematicsException(`Targets are not defined for this project.`);
        }
        const buildTargets = [];
        const testTargets = [];
        for (const targetName in projectTargets) {
            const target = projectTargets[targetName];
            if (!target) {
                continue;
            }
            if (target.builder === '@angular-devkit/build-angular:browser') {
                buildTargets.push(target);
            }
            else if (target.builder === '@angular-devkit/build-angular:karma') {
                testTargets.push(target);
            }
        }
        // Add manifest to asset configuration
        const assetEntry = core_1.join(core_1.normalize(project.root), 'src', 'manifest.json');
        for (const target of [...buildTargets, ...testTargets]) {
            if (target.options) {
                if (target.options.assets) {
                    target.options.assets.push(assetEntry);
                }
                else {
                    target.options.assets = [assetEntry];
                }
            }
            else {
                target.options = { assets: [assetEntry] };
            }
        }
        host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
        // Find all index.html files in build targets
        const indexFiles = new Set();
        for (const target of buildTargets) {
            if (target.options && target.options.index) {
                indexFiles.add(target.options.index);
            }
            if (!target.configurations) {
                continue;
            }
            for (const configName in target.configurations) {
                const configuration = target.configurations[configName];
                if (configuration && configuration.index) {
                    indexFiles.add(configuration.index);
                }
            }
        }
        // Setup sources for the assets files to add to the project
        const sourcePath = core_1.join(core_1.normalize(project.root), 'src');
        const assetsPath = core_1.join(sourcePath, 'assets');
        const rootTemplateSource = schematics_1.apply(schematics_1.url('./files/root'), [
            schematics_1.template(Object.assign({}, options)),
            schematics_1.move(core_1.getSystemPath(sourcePath)),
        ]);
        const assetsTemplateSource = schematics_1.apply(schematics_1.url('./files/assets'), [
            schematics_1.template(Object.assign({}, options)),
            schematics_1.move(core_1.getSystemPath(assetsPath)),
        ]);
        // Setup service worker schematic options
        const swOptions = Object.assign({}, options);
        delete swOptions.title;
        // Chain the rules and return
        return schematics_1.chain([
            schematics_1.externalSchematic('@schematics/angular', 'service-worker', swOptions),
            schematics_1.mergeWith(rootTemplateSource),
            schematics_1.mergeWith(assetsTemplateSource),
            ...[...indexFiles].map(path => updateIndexFile(path)),
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvcHdhL3B3YS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7RUFNRTtBQUNGLCtDQU84QjtBQUM5QiwyREFZb0M7QUFDcEMsK0JBQWtDO0FBQ2xDLG1DQUE0QztBQUc1QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUdoRSxTQUFTLFlBQVksQ0FDbkIsSUFBVTtJQUVWLE1BQU0sYUFBYSxHQUFHLENBQUUsZUFBZSxFQUFFLGdCQUFnQixDQUFFLENBQUM7SUFDNUQsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtRQUN6QixNQUFNLElBQUksZ0NBQW1CLENBQUMsbUJBQW1CLElBQUksR0FBRyxDQUFDLENBQUM7S0FDM0Q7SUFDRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFeEMsT0FBTztRQUNMLElBQUk7UUFDSixTQUFTLEVBQUUsZ0JBQVMsQ0FDbEIsT0FBTyxFQUNQLG9CQUFhLENBQUMsS0FBSyxDQUM0QjtLQUNsRCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLElBQVk7SUFDbkMsT0FBTyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ25CLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyw4QkFBOEIsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNyRTtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFdkMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBNkIsRUFBRSxFQUFFO1lBQ3hELElBQUksUUFBUSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7Z0JBQ25DLGFBQWEsR0FBRyxLQUFLLENBQUM7YUFDdkI7WUFFRCxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUEyQixFQUFFLEVBQUU7WUFDcEQsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRTtnQkFDN0IsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO2dCQUNuRSxRQUFRLENBQUMsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7YUFDckU7aUJBQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLE1BQU0sSUFBSSxhQUFhLEVBQUU7Z0JBQ3JELFFBQVEsQ0FBQyxPQUFPLENBQ2QsdUZBQXVGLENBQ3hGLENBQUM7YUFDSDtZQUVELFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksaUJBQVUsQ0FBTyxHQUFHLENBQUMsRUFBRTtZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLGlCQUFRLENBQUM7Z0JBQ3pCLFFBQVEsRUFBRSxNQUFNO2dCQUNoQixJQUFJO29CQUNGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xCLENBQUM7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBa0IsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQVEsQ0FBQztnQkFDMUIsS0FBSyxDQUFDLEtBQXNCLEVBQUUsUUFBZ0IsRUFBRSxRQUFrQjtvQkFDaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDOUUsUUFBUSxFQUFFLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxLQUFLLENBQUMsUUFBaUM7b0JBQ3JDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUN0QyxRQUFRLEVBQUUsQ0FBQztvQkFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNmLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDakIsQ0FBQzthQUNGLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELG1CQUF5QixPQUFtQjtJQUMxQyxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNsQixPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDakM7UUFDRCxNQUFNLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDcEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDaEU7UUFFRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLDJDQUEyQyxDQUFDLENBQUM7U0FDNUU7UUFFRCxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssYUFBYSxFQUFFO1lBQ3pDLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1NBQ2hGO1FBRUQsZ0RBQWdEO1FBQ2hELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUM1RCxJQUFJLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsMkNBQTJDLENBQUMsQ0FBQztTQUM1RTtRQUVELE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN4QixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdkIsS0FBSyxNQUFNLFVBQVUsSUFBSSxjQUFjLEVBQUU7WUFDdkMsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ1gsU0FBUzthQUNWO1lBRUQsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLHVDQUF1QyxFQUFFO2dCQUM5RCxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzNCO2lCQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxxQ0FBcUMsRUFBRTtnQkFDbkUsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUMxQjtTQUNGO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLFdBQUksQ0FBQyxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekUsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLEdBQUcsWUFBWSxFQUFFLEdBQUcsV0FBVyxDQUFDLEVBQUU7WUFDdEQsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNsQixJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO29CQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3hDO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUUsVUFBVSxDQUFFLENBQUM7aUJBQ3hDO2FBQ0Y7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFFLFVBQVUsQ0FBRSxFQUFFLENBQUM7YUFDN0M7U0FDRjtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxFLDZDQUE2QztRQUM3QyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3JDLEtBQUssTUFBTSxNQUFNLElBQUksWUFBWSxFQUFFO1lBQ2pDLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtnQkFDMUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3RDO1lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7Z0JBQzFCLFNBQVM7YUFDVjtZQUNELEtBQUssTUFBTSxVQUFVLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRTtnQkFDOUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRTtvQkFDeEMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3JDO2FBQ0Y7U0FDRjtRQUVELDJEQUEyRDtRQUMzRCxNQUFNLFVBQVUsR0FBRyxXQUFJLENBQUMsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsTUFBTSxVQUFVLEdBQUcsV0FBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5QyxNQUFNLGtCQUFrQixHQUFHLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUNwRCxxQkFBUSxtQkFBTSxPQUFPLEVBQUc7WUFDeEIsaUJBQUksQ0FBQyxvQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUNILE1BQU0sb0JBQW9CLEdBQUcsa0JBQUssQ0FBQyxnQkFBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDeEQscUJBQVEsbUJBQU0sT0FBTyxFQUFHO1lBQ3hCLGlCQUFJLENBQUMsb0JBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsTUFBTSxTQUFTLHFCQUFRLE9BQU8sQ0FBRSxDQUFDO1FBQ2pDLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQztRQUV2Qiw2QkFBNkI7UUFDN0IsT0FBTyxrQkFBSyxDQUFDO1lBQ1gsOEJBQWlCLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDO1lBQ3JFLHNCQUFTLENBQUMsa0JBQWtCLENBQUM7WUFDN0Isc0JBQVMsQ0FBQyxvQkFBb0IsQ0FBQztZQUMvQixHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdEQsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7QUFDSixDQUFDO0FBbEdELDRCQWtHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuKiBAbGljZW5zZVxuKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbipcbiogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuKi9cbmltcG9ydCB7XG4gIEpzb25QYXJzZU1vZGUsXG4gIGV4cGVyaW1lbnRhbCxcbiAgZ2V0U3lzdGVtUGF0aCxcbiAgam9pbixcbiAgbm9ybWFsaXplLFxuICBwYXJzZUpzb24sXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZXh0ZXJuYWxTY2hlbWF0aWMsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgUmVhZGFibGUsIFdyaXRhYmxlIH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7IFNjaGVtYSBhcyBQd2FPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5jb25zdCBSZXdyaXRpbmdTdHJlYW0gPSByZXF1aXJlKCdwYXJzZTUtaHRtbC1yZXdyaXRpbmctc3RyZWFtJyk7XG5cblxuZnVuY3Rpb24gZ2V0V29ya3NwYWNlKFxuICBob3N0OiBUcmVlLFxuKTogeyBwYXRoOiBzdHJpbmcsIHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWEgfSB7XG4gIGNvbnN0IHBvc3NpYmxlRmlsZXMgPSBbICcvYW5ndWxhci5qc29uJywgJy8uYW5ndWxhci5qc29uJyBdO1xuICBjb25zdCBwYXRoID0gcG9zc2libGVGaWxlcy5maWx0ZXIocGF0aCA9PiBob3N0LmV4aXN0cyhwYXRoKSlbMF07XG5cbiAgY29uc3QgY29uZmlnQnVmZmVyID0gaG9zdC5yZWFkKHBhdGgpO1xuICBpZiAoY29uZmlnQnVmZmVyID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICgke3BhdGh9KWApO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSBjb25maWdCdWZmZXIudG9TdHJpbmcoKTtcblxuICByZXR1cm4ge1xuICAgIHBhdGgsXG4gICAgd29ya3NwYWNlOiBwYXJzZUpzb24oXG4gICAgICBjb250ZW50LFxuICAgICAgSnNvblBhcnNlTW9kZS5Mb29zZSxcbiAgICApIGFzIHt9IGFzIGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVJbmRleEZpbGUocGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwYXRoKTtcbiAgICBpZiAoYnVmZmVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IHJlYWQgaW5kZXggZmlsZTogJHtwYXRofWApO1xuICAgIH1cblxuICAgIGNvbnN0IHJld3JpdGVyID0gbmV3IFJld3JpdGluZ1N0cmVhbSgpO1xuXG4gICAgbGV0IG5lZWRzTm9TY3JpcHQgPSB0cnVlO1xuICAgIHJld3JpdGVyLm9uKCdzdGFydFRhZycsIChzdGFydFRhZzogeyB0YWdOYW1lOiBzdHJpbmcgfSkgPT4ge1xuICAgICAgaWYgKHN0YXJ0VGFnLnRhZ05hbWUgPT09ICdub3NjcmlwdCcpIHtcbiAgICAgICAgbmVlZHNOb1NjcmlwdCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXdyaXRlci5lbWl0U3RhcnRUYWcoc3RhcnRUYWcpO1xuICAgIH0pO1xuXG4gICAgcmV3cml0ZXIub24oJ2VuZFRhZycsIChlbmRUYWc6IHsgdGFnTmFtZTogc3RyaW5nIH0pID0+IHtcbiAgICAgIGlmIChlbmRUYWcudGFnTmFtZSA9PT0gJ2hlYWQnKSB7XG4gICAgICAgIHJld3JpdGVyLmVtaXRSYXcoJyAgPGxpbmsgcmVsPVwibWFuaWZlc3RcIiBocmVmPVwibWFuaWZlc3QuanNvblwiPlxcbicpO1xuICAgICAgICByZXdyaXRlci5lbWl0UmF3KCcgIDxtZXRhIG5hbWU9XCJ0aGVtZS1jb2xvclwiIGNvbnRlbnQ9XCIjMTk3NmQyXCI+XFxuJyk7XG4gICAgICB9IGVsc2UgaWYgKGVuZFRhZy50YWdOYW1lID09PSAnYm9keScgJiYgbmVlZHNOb1NjcmlwdCkge1xuICAgICAgICByZXdyaXRlci5lbWl0UmF3KFxuICAgICAgICAgICcgIDxub3NjcmlwdD5QbGVhc2UgZW5hYmxlIEphdmFTY3JpcHQgdG8gY29udGludWUgdXNpbmcgdGhpcyBhcHBsaWNhdGlvbi48L25vc2NyaXB0PlxcbicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJld3JpdGVyLmVtaXRFbmRUYWcoZW5kVGFnKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxUcmVlPihvYnMgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSBuZXcgUmVhZGFibGUoe1xuICAgICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgICByZWFkKCk6IHZvaWQge1xuICAgICAgICAgIHRoaXMucHVzaChidWZmZXIpO1xuICAgICAgICAgIHRoaXMucHVzaChudWxsKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjaHVua3M6IEFycmF5PEJ1ZmZlcj4gPSBbXTtcbiAgICAgIGNvbnN0IG91dHB1dCA9IG5ldyBXcml0YWJsZSh7XG4gICAgICAgIHdyaXRlKGNodW5rOiBzdHJpbmcgfCBCdWZmZXIsIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbik6IHZvaWQge1xuICAgICAgICAgIGNodW5rcy5wdXNoKHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycgPyBCdWZmZXIuZnJvbShjaHVuaywgZW5jb2RpbmcpIDogY2h1bmspO1xuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsKGNhbGxiYWNrOiAoZXJyb3I/OiBFcnJvcikgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICAgIGNvbnN0IGZ1bGwgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7XG4gICAgICAgICAgaG9zdC5vdmVyd3JpdGUocGF0aCwgZnVsbC50b1N0cmluZygpKTtcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIG9icy5uZXh0KGhvc3QpO1xuICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGlucHV0LnBpcGUocmV3cml0ZXIpLnBpcGUob3V0cHV0KTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFB3YU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLnRpdGxlKSB7XG4gICAgICBvcHRpb25zLnRpdGxlID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgIH1cbiAgICBjb25zdCB7cGF0aDogd29ya3NwYWNlUGF0aCwgd29ya3NwYWNlIH0gPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ09wdGlvbiBcInByb2plY3RcIiBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzW29wdGlvbnMucHJvamVjdF07XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIHdvcmtzcGFjZS5gKTtcbiAgICB9XG5cbiAgICBpZiAocHJvamVjdC5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFBXQSByZXF1aXJlcyBhIHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIuYCk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgdGhlIHJlbGV2YW50IHRhcmdldHMgZm9yIHRoZSBwcm9qZWN0XG4gICAgY29uc3QgcHJvamVjdFRhcmdldHMgPSBwcm9qZWN0LnRhcmdldHMgfHwgcHJvamVjdC5hcmNoaXRlY3Q7XG4gICAgaWYgKCFwcm9qZWN0VGFyZ2V0cyB8fCBPYmplY3Qua2V5cyhwcm9qZWN0VGFyZ2V0cykubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVGFyZ2V0cyBhcmUgbm90IGRlZmluZWQgZm9yIHRoaXMgcHJvamVjdC5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBidWlsZFRhcmdldHMgPSBbXTtcbiAgICBjb25zdCB0ZXN0VGFyZ2V0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgdGFyZ2V0TmFtZSBpbiBwcm9qZWN0VGFyZ2V0cykge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcHJvamVjdFRhcmdldHNbdGFyZ2V0TmFtZV07XG4gICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldC5idWlsZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6YnJvd3NlcicpIHtcbiAgICAgICAgYnVpbGRUYXJnZXRzLnB1c2godGFyZ2V0KTtcbiAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LmJ1aWxkZXIgPT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjprYXJtYScpIHtcbiAgICAgICAgdGVzdFRhcmdldHMucHVzaCh0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBtYW5pZmVzdCB0byBhc3NldCBjb25maWd1cmF0aW9uXG4gICAgY29uc3QgYXNzZXRFbnRyeSA9IGpvaW4obm9ybWFsaXplKHByb2plY3Qucm9vdCksICdzcmMnLCAnbWFuaWZlc3QuanNvbicpO1xuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIFsuLi5idWlsZFRhcmdldHMsIC4uLnRlc3RUYXJnZXRzXSkge1xuICAgICAgaWYgKHRhcmdldC5vcHRpb25zKSB7XG4gICAgICAgIGlmICh0YXJnZXQub3B0aW9ucy5hc3NldHMpIHtcbiAgICAgICAgICB0YXJnZXQub3B0aW9ucy5hc3NldHMucHVzaChhc3NldEVudHJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0YXJnZXQub3B0aW9ucy5hc3NldHMgPSBbIGFzc2V0RW50cnkgXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0Lm9wdGlvbnMgPSB7IGFzc2V0czogWyBhc3NldEVudHJ5IF0gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgaG9zdC5vdmVyd3JpdGUod29ya3NwYWNlUGF0aCwgSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlLCBudWxsLCAyKSk7XG5cbiAgICAvLyBGaW5kIGFsbCBpbmRleC5odG1sIGZpbGVzIGluIGJ1aWxkIHRhcmdldHNcbiAgICBjb25zdCBpbmRleEZpbGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgYnVpbGRUYXJnZXRzKSB7XG4gICAgICBpZiAodGFyZ2V0Lm9wdGlvbnMgJiYgdGFyZ2V0Lm9wdGlvbnMuaW5kZXgpIHtcbiAgICAgICAgaW5kZXhGaWxlcy5hZGQodGFyZ2V0Lm9wdGlvbnMuaW5kZXgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRhcmdldC5jb25maWd1cmF0aW9ucykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgY29uZmlnTmFtZSBpbiB0YXJnZXQuY29uZmlndXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbiA9IHRhcmdldC5jb25maWd1cmF0aW9uc1tjb25maWdOYW1lXTtcbiAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24gJiYgY29uZmlndXJhdGlvbi5pbmRleCkge1xuICAgICAgICAgIGluZGV4RmlsZXMuYWRkKGNvbmZpZ3VyYXRpb24uaW5kZXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2V0dXAgc291cmNlcyBmb3IgdGhlIGFzc2V0cyBmaWxlcyB0byBhZGQgdG8gdGhlIHByb2plY3RcbiAgICBjb25zdCBzb3VyY2VQYXRoID0gam9pbihub3JtYWxpemUocHJvamVjdC5yb290KSwgJ3NyYycpO1xuICAgIGNvbnN0IGFzc2V0c1BhdGggPSBqb2luKHNvdXJjZVBhdGgsICdhc3NldHMnKTtcbiAgICBjb25zdCByb290VGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICB0ZW1wbGF0ZSh7IC4uLm9wdGlvbnMgfSksXG4gICAgICBtb3ZlKGdldFN5c3RlbVBhdGgoc291cmNlUGF0aCkpLFxuICAgIF0pO1xuICAgIGNvbnN0IGFzc2V0c1RlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL2Fzc2V0cycpLCBbXG4gICAgICB0ZW1wbGF0ZSh7IC4uLm9wdGlvbnMgfSksXG4gICAgICBtb3ZlKGdldFN5c3RlbVBhdGgoYXNzZXRzUGF0aCkpLFxuICAgIF0pO1xuXG4gICAgLy8gU2V0dXAgc2VydmljZSB3b3JrZXIgc2NoZW1hdGljIG9wdGlvbnNcbiAgICBjb25zdCBzd09wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBkZWxldGUgc3dPcHRpb25zLnRpdGxlO1xuXG4gICAgLy8gQ2hhaW4gdGhlIHJ1bGVzIGFuZCByZXR1cm5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgZXh0ZXJuYWxTY2hlbWF0aWMoJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLCAnc2VydmljZS13b3JrZXInLCBzd09wdGlvbnMpLFxuICAgICAgbWVyZ2VXaXRoKHJvb3RUZW1wbGF0ZVNvdXJjZSksXG4gICAgICBtZXJnZVdpdGgoYXNzZXRzVGVtcGxhdGVTb3VyY2UpLFxuICAgICAgLi4uWy4uLmluZGV4RmlsZXNdLm1hcChwYXRoID0+IHVwZGF0ZUluZGV4RmlsZShwYXRoKSksXG4gICAgXSkoaG9zdCwgY29udGV4dCk7XG4gIH07XG59XG4iXX0=