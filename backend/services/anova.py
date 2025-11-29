"""
ANOVA Analysis Service - V2.0
Implements One-Way ANOVA with Bonferroni and Benjamini-Hochberg corrections
+ Multcompare, Global/Group stats, F-statistics
"""
import logging
from typing import Any

import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests

logger = logging.getLogger(__name__)


class AnovaAnalyzer:
    """One-Way ANOVA analyzer with multiple testing corrections"""
    
    def __init__(self, fdr_threshold: float = 0.05):
        self.fdr_threshold = fdr_threshold
    
    def analyze(
        self,
        data: np.ndarray,
        classes: np.ndarray,
        design_label: str,
        plot_option: int,
        var_names: list[str] | None = None
    ) -> dict[str, Any]:
        """
        Perform One-Way ANOVA analysis
        
        Args:
            data: Data matrix (samples × variables)
            classes: Class labels for each sample
            design_label: Name of the design factor
            plot_option: Plotting option
            var_names: Variable names
        
        Returns:
            Complete ANOVA results with multcompare, stats, boxplots
        """
        n_samples, n_vars = data.shape
        unique_classes = np.unique(classes)
        n_groups = len(unique_classes)
        
        logger.info(f"Running ANOVA on {n_samples} samples × {n_vars} variables, {n_groups} groups")
        
        # Initialize arrays
        p_values = []
        f_statistics = []  # NEW: F-stats
        effect_sizes = []
        all_multicomparisons = []  # NEW: Store multcompare for each variable
        
        # Compute ANOVA for each variable
        for i in range(n_vars):
            var_data = data[:, i]
            
            # Remove NaNs
            mask = ~np.isnan(var_data)
            var_clean = var_data[mask]
            class_clean = classes[mask]
            
            # Skip if insufficient data
            if len(np.unique(class_clean)) < 2:
                p_values.append(1.0)
                f_statistics.append(0.0)
                effect_sizes.append(0.0)
                all_multicomparisons.append([])
                continue
            
            # Group data by class
            groups = [var_clean[class_clean == cls] for cls in np.unique(class_clean)]
            
            # Compute One-Way ANOVA
            f_stat, p_val = stats.f_oneway(*groups)
            p_values.append(p_val if not np.isnan(p_val) else 1.0)
            f_statistics.append(float(f_stat) if not np.isnan(f_stat) else 0.0)
            
            # Effect size (η²)
            ss_between = sum(len(g) * (np.mean(g) - np.mean(var_clean))**2 for g in groups)
            ss_total = np.sum((var_clean - np.mean(var_clean))**2)
            effect = (ss_between / ss_total * 100) if ss_total > 0 else 0
            effect_sizes.append(effect)
            
            # Multcompare (post-hoc pairwise comparisons)
            multicomp = self._perform_multcompare(data, classes, i, var_names[i] if var_names else f'Var_{i+1}')
            all_multicomparisons.append(multicomp)
        
        p_values = np.array(p_values)
        f_statistics = np.array(f_statistics)
        effect_sizes = np.array(effect_sizes)
        
        # Bonferroni correction
        bonferroni_threshold = self.fdr_threshold / len(p_values)
        bonferroni_sig = p_values <= bonferroni_threshold
        
        # Benjamini-Hochberg correction
        benjamini_sig, fdr_corrected, _, _ = multipletests(
            p_values,
            alpha=self.fdr_threshold,
            method='fdr_bh'
        )
        
        # Build results table
        results_table = []
        for i in range(n_vars):
            var_name = var_names[i] if var_names and i < len(var_names) else f'Variable_{i+1}'
            results_table.append({
                'variable': var_name,
                'pValue': float(p_values[i]),
                'fdr': float(fdr_corrected[i]),
                'bonferroni': float(p_values[i] * len(p_values)),  # Adjusted p-value
                'benjamini': bool(benjamini_sig[i]),
                'effectSize': float(effect_sizes[i]),
                'fStat': float(f_statistics[i])  # NEW!
            })
        
        # Get significant variables based on plot_option
        significant_vars = self._get_significant_vars(
            results_table,
            plot_option,
            benjamini_sig
        )
        
        # Compute boxplot data for top significant variables (PER GROUP!)
        boxplot_data = self._compute_boxplots_per_group(
            data,
            classes,
            var_names,
            significant_vars[:4]  # Top 4 variables
        )
        
        # Compute global and group statistics
        global_stats = self._compute_global_stats(data, var_names)
        group_stats = self._compute_group_stats(data, classes, var_names)
        
        # Prepare overview data for visualization
        sorted_indices = np.argsort(p_values)
        
        # Calculate thresholds for visualization
        benjamini_threshold = float(np.max(p_values[benjamini_sig])) if np.any(benjamini_sig) else self.fdr_threshold
        
        overview_data = {
            'p_values_sorted': p_values[sorted_indices].tolist(),
            'benjamini_indices': np.where(benjamini_sig[sorted_indices])[0].tolist(),
            'bonferroni_indices': np.where(bonferroni_sig[sorted_indices])[0].tolist(),
            'bonferroni_threshold': float(bonferroni_threshold),
            'benjamini_threshold': benjamini_threshold,
            'nominal_threshold': 0.05
        }
        
        # Flatten multicomparison results
        multicomp_table = []
        for var_idx, multicomp_list in enumerate(all_multicomparisons):
            for comp in multicomp_list:
                multicomp_table.append({
                    'variableIndex': var_idx + 1,
                    'variable': var_names[var_idx] if var_names else f'Variable_{var_idx+1}',
                    **comp
                })
        
        logger.info(f"ANOVA Complete: {np.sum(benjamini_sig)} Benjamini significant, "
                   f"{np.sum(bonferroni_sig)} Bonferroni significant")
        
        return {
            'results': results_table,
            'multicomparison': multicomp_table,  # NEW!
            'global_stats': global_stats,  # NEW!
            'group_stats': group_stats,  # NEW!
            'boxplot_data': boxplot_data,  # UPDATED: per group
            'overview_data': overview_data,  # NEW!
            'summary': {
                'total_variables': n_vars,
                'benjamini_significant': int(np.sum(benjamini_sig)),
                'bonferroni_significant': int(np.sum(bonferroni_sig)),
                'nominal_significant': int(np.sum(p_values <= 0.05)),
                'num_groups': n_groups
            }
        }
    
    def _perform_multcompare(
        self,
        data: np.ndarray,
        classes: np.ndarray,
        var_idx: int,
        var_name: str
    ) -> list[dict]:
        """
        Perform pairwise comparisons for ONE variable (like MATLAB's multcompare)
        
        Args:
            data: Full data matrix
            classes: Class labels
            var_idx: Index of variable to analyze
            var_name: Name of variable
        
        Returns:
            List of pairwise comparison results
        """
        var_data = data[:, var_idx]
        unique_classes = np.unique(classes)
        comparisons = []
        
        # Perform all pairwise comparisons
        for i in range(len(unique_classes)):
            for j in range(i + 1, len(unique_classes)):
                cls_i = unique_classes[i]
                cls_j = unique_classes[j]
                
                # Extract groups
                group_i = var_data[classes == cls_i]
                group_j = var_data[classes == cls_j]
                
                # Remove NaNs
                group_i = group_i[~np.isnan(group_i)]
                group_j = group_j[~np.isnan(group_j)]
                
                if len(group_i) < 2 or len(group_j) < 2:
                    continue
                
                # T-test
                try:
                    t_stat, p_val = stats.ttest_ind(group_i, group_j)
                    mean_diff = float(np.mean(group_i) - np.mean(group_j))
                    
                    comparisons.append({
                        'groupX': int(cls_i),
                        'groupY': int(cls_j),
                        'pValue': float(p_val) if not np.isnan(p_val) else 1.0,
                        'mean_diff': mean_diff,
                        'tStat': float(t_stat) if not np.isnan(t_stat) else 0.0
                    })
                except Exception as e:
                    logger.warning(f"Multcompare failed for {var_name} groups {cls_i}-{cls_j}: {e}")
                    continue
        
        # FDR correction on all comparisons for THIS variable
        if comparisons:
            p_vals = [c['pValue'] for c in comparisons]
            _, fdr_corrected, _, _ = multipletests(p_vals, method='fdr_bh')
            
            for idx, comp in enumerate(comparisons):
                comp['pValue_FDR'] = float(fdr_corrected[idx])
        
        return comparisons
    
    def _compute_global_stats(self, data: np.ndarray, var_names: list[str] | None) -> dict:
        """
        Compute global statistics for ALL variables (like MATLAB's GLOBALSTATDATA)
        
        Returns:
            {
                'variables': [...],
                'RSD': [...],
                'STD': [...],
                'MEAN': [...],
                'RANGE': [...],
                'MIN': [...],
                'MAX': [...]
            }
        """
        n_vars = data.shape[1]
        
        stats_dict = {
            'variables': [var_names[i] if var_names else f'Variable_{i+1}' for i in range(n_vars)],
            'RSD': [],
            'STD': [],
            'MEAN': [],
            'RANGE': [],
            'MIN': [],
            'MAX': []
        }
        
        for i in range(n_vars):
            var_data = data[:, i]
            var_clean = var_data[~np.isnan(var_data)]
            
            if len(var_clean) == 0:
                stats_dict['RSD'].append(0.0)
                stats_dict['STD'].append(0.0)
                stats_dict['MEAN'].append(0.0)
                stats_dict['RANGE'].append(0.0)
                stats_dict['MIN'].append(0.0)
                stats_dict['MAX'].append(0.0)
                continue
            
            mean_val = float(np.mean(var_clean))
            std_val = float(np.std(var_clean, ddof=1) if len(var_clean) > 1 else 0.0)
            rsd_val = (std_val / mean_val * 100) if mean_val != 0 else 0.0
            
            stats_dict['RSD'].append(rsd_val)
            stats_dict['STD'].append(std_val)
            stats_dict['MEAN'].append(mean_val)
            stats_dict['RANGE'].append(float(np.max(var_clean) - np.min(var_clean)))
            stats_dict['MIN'].append(float(np.min(var_clean)))
            stats_dict['MAX'].append(float(np.max(var_clean)))
        
        return stats_dict
    
    def _compute_group_stats(self, data: np.ndarray, classes: np.ndarray, var_names: list[str] | None) -> dict:
        """
        Compute statistics for EACH group separately (like MATLAB's GROUPSTATDATA)
        
        Returns:
            {
                'Group1': {'RSD': [...], 'STD': [...], ...},
                'Group2': {'RSD': [...], 'STD': [...], ...},
                ...
            }
        """
        unique_classes = np.unique(classes)
        n_vars = data.shape[1]
        group_stats = {}
        
        for cls in unique_classes:
            group_data = data[classes == cls]
            
            group_name = f'Group{int(cls)}'
            group_stats[group_name] = {
                'RSD': [],
                'STD': [],
                'MEAN': [],
                'RANGE': [],
                'MIN': [],
                'MAX': []
            }
            
            for i in range(n_vars):
                var_data = group_data[:, i]
                var_clean = var_data[~np.isnan(var_data)]
                
                if len(var_clean) == 0:
                    group_stats[group_name]['RSD'].append(0.0)
                    group_stats[group_name]['STD'].append(0.0)
                    group_stats[group_name]['MEAN'].append(0.0)
                    group_stats[group_name]['RANGE'].append(0.0)
                    group_stats[group_name]['MIN'].append(0.0)
                    group_stats[group_name]['MAX'].append(0.0)
                    continue
                
                mean_val = float(np.mean(var_clean))
                std_val = float(np.std(var_clean, ddof=1) if len(var_clean) > 1 else 0.0)
                rsd_val = (std_val / mean_val * 100) if mean_val != 0 else 0.0
                
                group_stats[group_name]['RSD'].append(rsd_val)
                group_stats[group_name]['STD'].append(std_val)
                group_stats[group_name]['MEAN'].append(mean_val)
                group_stats[group_name]['RANGE'].append(float(np.max(var_clean) - np.min(var_clean)))
                group_stats[group_name]['MIN'].append(float(np.min(var_clean)))
                group_stats[group_name]['MAX'].append(float(np.max(var_clean)))
        
        return group_stats
    
    def _get_significant_vars(
        self,
        results: list[dict],
        plot_option: int,
        benjamini_sig: np.ndarray
    ) -> list[int]:
        """Get significant variable indices based on plot option"""
        if plot_option == 0:
            return []
        elif plot_option == 1:  # Nominal p-value
            return [i for i, r in enumerate(results) if r['pValue'] <= 0.05]
        elif plot_option == 2:  # Bonferroni
            return [i for i, r in enumerate(results) if r['bonferroni'] <= self.fdr_threshold]
        elif plot_option == 3:  # Benjamini-Hochberg
            return [i for i, r in enumerate(results) if benjamini_sig[i]]
        else:  # All variables
            return list(range(len(results)))
    
    def _compute_boxplots_per_group(
        self,
        data: np.ndarray,
        classes: np.ndarray,
        var_names: list[str] | None,
        var_indices: list[int]
    ) -> dict:
        """
        Compute boxplot statistics for EACH GROUP separately
        
        Returns:
            {
                "variable_0": {
                    "variable_name": "Col_1",
                    "groups": {
                        "Group1": {"min": ..., "q1": ..., "median": ..., "q3": ..., "max": ..., "values": [...]},
                        "Group2": {...},
                        ...
                    }
                },
                ...
            }
        """
        boxplot_data = {}
        unique_classes = np.unique(classes)
        
        for var_idx in var_indices:
            var_data = data[:, var_idx]
            var_name = var_names[var_idx] if var_names else f'Variable_{var_idx+1}'
            
            groups_boxplots = {}
            
            for cls in unique_classes:
                cls_data = var_data[classes == cls]
                cls_data = cls_data[~np.isnan(cls_data)]
                
                if len(cls_data) == 0:
                    continue
                
                # Handle edge case: single value
                if len(cls_data) == 1:
                    val = float(cls_data[0])
                    groups_boxplots[f'Group{int(cls)}'] = {
                        'min': val,
                        'q1': val,
                        'median': val,
                        'q3': val,
                        'max': val,
                        'values': [val],
                        'n': 1
                    }
                    continue
                
                # Compute percentiles
                percentiles = np.percentile(cls_data, [25, 50, 75])
                q1, median, q3 = percentiles
                iqr = q3 - q1
                
                # Whiskers (1.5 * IQR rule)
                lower = float(max(np.min(cls_data), q1 - 1.5 * iqr))
                upper = float(min(np.max(cls_data), q3 + 1.5 * iqr))
                
                groups_boxplots[f'Group{int(cls)}'] = {
                    'min': lower,
                    'q1': float(q1),
                    'median': float(median),
                    'q3': float(q3),
                    'max': upper,
                    'values': cls_data.tolist(),
                    'n': len(cls_data)
                }
            
            # Compute MATLAB-style Y-axis limits: [min*0.75, max*1.25]
            all_values = [v for g in groups_boxplots.values() for v in g['values']]
            if len(all_values) > 0:
                data_min = float(np.min(all_values))
                data_max = float(np.max(all_values))
                y_min = data_min * 0.75 if data_min > 0 else data_min * 1.25
                y_max = data_max * 1.25 if data_max > 0 else data_max * 0.75
            else:
                y_min, y_max = 0, 1
            
            boxplot_data[f'variable_{var_idx}'] = {
                'variable_name': var_name,
                'groups': groups_boxplots,
                'y_limits': {'min': y_min, 'max': y_max}  # MATLAB scaling
            }
        
        return boxplot_data
