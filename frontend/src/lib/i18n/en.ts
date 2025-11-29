/**
 * English translations
 * Edit this file to change English UI text
 */
export const en = {
  // ═══════════════════════════════════════════════════════════════════════════
  // General
  // ═══════════════════════════════════════════════════════════════════════════
  'app.name': 'KKH Analysis',
  'app.loading': 'Loading...',
  'app.save': 'Save',
  'app.cancel': 'Cancel',
  'app.delete': 'Delete',
  'app.rename': 'Rename',
  'app.search': 'Search...',
  'app.upload': 'Upload',
  'app.close': 'Close',
  'app.comingSoon': 'Coming Soon',

  // ═══════════════════════════════════════════════════════════════════════════
  // File Manager
  // ═══════════════════════════════════════════════════════════════════════════
  'files.newProject': 'New file project',
  'files.newFolder': 'New folder',
  'files.noProjects': 'No projects yet',
  'files.noProjectsFound': 'No projects found',
  'files.dropHere': 'Drop files here or use Upload',
  'files.uploadFiles': 'Upload files',
  'files.uploadSuccess': 'Uploaded',
  'files.uploadFailed': 'Upload failed',
  'files.uploadFile': 'Upload file',
  'files.newSubfolder': 'New subfolder',

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Preview
  // ═══════════════════════════════════════════════════════════════════════════
  'data.overview': 'Data Overview',
  'data.samples': 'samples',
  'data.variables': 'variables',
  'data.classColumns': 'Class Columns',
  'data.groups': 'groups',
  'data.numericVariables': 'numeric variables detected',
  'data.viewFull': 'View Full Data',
  'data.fullView': 'Full Data View',
  'data.rows': 'rows',
  'data.columns': 'columns',
  'data.scrollHint': 'Scroll horizontally and vertically to see all data',

  // ═══════════════════════════════════════════════════════════════════════════
  // Analysis Settings
  // ═══════════════════════════════════════════════════════════════════════════
  'analysis.settings': 'Analysis Settings',
  'analysis.configure': 'Configure statistical analysis parameters',
  'analysis.method': 'Analysis Method',
  'analysis.anova': 'One-way ANOVA',
  'analysis.anovaDesc': 'Compares means between groups to identify statistically significant differences',
  'analysis.pca': 'PCA',
  'analysis.pcaDesc': 'Reduces data dimensionality while preserving maximum variance',
  'analysis.groupingVar': 'Grouping Variable',
  'analysis.selectColumn': 'Select column...',
  'analysis.uniqueGroups': 'unique groups',
  'analysis.groupsFound': 'groups found',
  'analysis.fdrThreshold': 'FDR Threshold',
  'analysis.fdrHelp': 'False Discovery Rate — controls the proportion of false positives. Standard: 0.05',
  'analysis.designLabel': 'Design Label',
  'analysis.visualization': 'Results Visualization',
  'analysis.noPlots': 'No plots',
  'analysis.nominal': 'Nominal (p < 0.05)',
  'analysis.bonferroni': 'Bonferroni',
  'analysis.benjamini': 'Benjamini-Hochberg',
  'analysis.allVariables': 'All variables',
  'analysis.numComponents': 'Number of Components',
  'analysis.numComponentsHelp': 'Number of principal components. Usually 2-3 is enough for visualization',
  'analysis.scalingMethod': 'Scaling Method',
  'analysis.autoScale': 'Auto-scaling',
  'analysis.autoScaleDesc': 'Standardization: mean = 0, std = 1',
  'analysis.meanCenter': 'Mean centering',
  'analysis.meanCenterDesc': 'Center by mean only',
  'analysis.pareto': 'Pareto',
  'analysis.paretoDesc': 'Scale by square root of standard deviation',
  'analysis.run': 'Run',
  'analysis.running': 'Running analysis...',
  'analysis.complete': 'Analysis complete',
  'analysis.failed': 'Analysis failed',
  'analysis.significantVars': 'significant variables',

  // ═══════════════════════════════════════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════════════════════════════════════
  'results.anova': 'ANOVA Results',
  'results.analyzed': 'variables analyzed',
  'results.totalVars': 'Total Variables',
  'results.benjaminiSig': 'Benjamini Sig.',
  'results.bonferroniSig': 'Bonferroni Sig.',
  'results.numGroups': 'Groups',
  'results.variable': 'Variable',
  'results.pValue': 'P-value',
  'results.fdr': 'FDR',
  'results.significant': 'Significant',
  'results.notSignificant': 'No',
  'results.topSignificant': 'Top Significant Variables',
  'results.observations': 'observations',
  'results.median': 'Median',
  'results.range': 'Range',

  // ═══════════════════════════════════════════════════════════════════════════
  // Box Plot
  // ═══════════════════════════════════════════════════════════════════════════
  'boxplot.resizeHint': '+ scroll to resize',
  'boxplot.minimize': 'Minimize',
  'boxplot.maximize': 'Maximize',
  'boxplot.groups': 'groups',

  // ═══════════════════════════════════════════════════════════════════════════
  // AI Assistant
  // ═══════════════════════════════════════════════════════════════════════════
  'ai.title': 'AI Assistant',
  'ai.placeholder': 'Ask about the analysis...',
  'ai.hint': 'Ask questions about the analysis results. Example: "Which variables are most significant?"',
  'ai.noAnalysis': 'Run an analysis to get AI insights',

  // ═══════════════════════════════════════════════════════════════════════════
  // Header
  // ═══════════════════════════════════════════════════════════════════════════
  'header.noProject': 'No project selected',
  'header.configurations': 'Configurations',
  'header.export': 'Export results (ZIP)',

  // ═══════════════════════════════════════════════════════════════════════════
  // PCA
  // ═══════════════════════════════════════════════════════════════════════════
  'pca.comingSoon': 'PCA visualization is coming soon!',
  'pca.comingSoonDesc': 'We are working on interactive PCA score plots and loading plots.',

  // ═══════════════════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════════════════
  'export.complete': 'Export complete!',
  'export.completeDesc': 'ZIP file downloaded with Excel, PNG boxplots, and original data',
  'export.failed': 'Export failed',
  'export.anovaOnly': 'Export only available for ANOVA results',

  // ═══════════════════════════════════════════════════════════════════════════
  // Tooltips & Descriptions
  // ═══════════════════════════════════════════════════════════════════════════
  'tooltip.bonferroni': 'Strict correction, minimum false positives',
  'tooltip.benjamini': 'Balance between sensitivity and specificity (recommended)',
  'tooltip.allVars': 'Full overview',
  'tooltip.nominal': 'Show variables with p < 0.05',
  'tooltip.noPlots': 'Do not build plots',

  // ═══════════════════════════════════════════════════════════════════════════
  // Empty State
  // ═══════════════════════════════════════════════════════════════════════════
  'empty.dropHere': 'Drop file here',
  'empty.startAnalysis': 'Start your analysis',
  'empty.description': 'Upload a CSV or Excel file to begin. The platform will automatically detect your data structure and prepare it for ANOVA or PCA analysis.',
  'empty.uploadBtn': 'Upload data file',
  'empty.supported': 'Supported: .csv, .xlsx, .xls',
} as const

