"""
Test to verify that boxplot limit ([:4]) has been removed
This test ensures ALL significant variables get boxplots, not just 4
"""
import logging
import numpy as np
from services.anova import AnovaAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_boxplot_limit_removed():
    """
    Generate data with 10 variables where ALL have very low p-values
    Verify that ALL 10 get boxplots (not just 4)
    """
    logger.info("🧪 Testing Boxplot Limit Removal...")
    
    # Generate test data with 10 variables
    # Make all variables significantly different between groups
    np.random.seed(42)
    n_samples = 15
    n_vars = 10
    n_groups = 3
    
    data = np.vstack([
        np.random.randn(n_samples, n_vars) + 0,   # Group 1: mean = 0
        np.random.randn(n_samples, n_vars) + 5,   # Group 2: mean = 5 (VERY different!)
        np.random.randn(n_samples, n_vars) + 10,  # Group 3: mean = 10 (VERY different!)
    ])
    
    classes = np.array([1] * n_samples + [2] * n_samples + [3] * n_samples)
    var_names = [f'Variable_{i+1}' for i in range(n_vars)]
    
    # Run ANOVA with plot_option=1 (Nominal p <= 0.05)
    # Since all variables are highly significant, all should get boxplots
    analyzer = AnovaAnalyzer(fdr_threshold=0.05)
    results = analyzer.analyze(
        data, 
        classes, 
        "Test", 
        plot_option=1,  # Nominal p <= 0.05
        var_names=var_names
    )
    
    # Check results
    n_significant = sum(1 for r in results['results'] if r['pValue'] <= 0.05)
    n_boxplots = len(results['boxplot_data'])
    
    logger.info(f"📊 Total variables: {n_vars}")
    logger.info(f"✅ Significant variables (p <= 0.05): {n_significant}")
    logger.info(f"📦 Boxplots generated: {n_boxplots}")
    
    # CRITICAL CHECK: If limit was removed, should have ALL significant vars
    if n_boxplots == 4 and n_significant > 4:
        logger.error("❌ FAILED: Still limited to 4 boxplots!")
        logger.error(f"   Expected {n_significant} boxplots, got {n_boxplots}")
        return False
    
    if n_boxplots == n_significant:
        logger.info(f"✅ SUCCESS: Generated boxplots for ALL {n_significant} significant variables!")
        logger.info("   Limit [:4] has been successfully removed!")
        return True
    else:
        logger.warning(f"⚠️ Unexpected: {n_boxplots} boxplots for {n_significant} significant vars")
        return False

def test_all_variables_option():
    """
    Test plot_option=4 (All variables) to ensure ALL get boxplots
    """
    logger.info("\n🧪 Testing plot_option=4 (All Variables)...")
    
    np.random.seed(123)
    n_vars = 8
    
    data = np.vstack([
        np.random.randn(10, n_vars) + 0,
        np.random.randn(10, n_vars) + 1,
    ])
    classes = np.array([1] * 10 + [2] * 10)
    var_names = [f'Var_{i+1}' for i in range(n_vars)]
    
    analyzer = AnovaAnalyzer()
    results = analyzer.analyze(
        data, 
        classes, 
        "Test", 
        plot_option=4,  # ALL variables
        var_names=var_names
    )
    
    n_boxplots = len(results['boxplot_data'])
    
    logger.info(f"📊 Total variables: {n_vars}")
    logger.info(f"📦 Boxplots generated: {n_boxplots}")
    
    if n_boxplots == n_vars:
        logger.info(f"✅ SUCCESS: All {n_vars} variables have boxplots!")
        return True
    elif n_boxplots == 4:
        logger.error(f"❌ FAILED: Still limited to 4 boxplots (expected {n_vars})!")
        return False
    else:
        logger.warning(f"⚠️ Unexpected: {n_boxplots} boxplots for {n_vars} variables")
        return False

if __name__ == "__main__":
    logger.info("=" * 70)
    logger.info("🔬 BOXPLOT LIMIT REMOVAL TEST")
    logger.info("=" * 70)
    
    test1_passed = test_boxplot_limit_removed()
    test2_passed = test_all_variables_option()
    
    logger.info("=" * 70)
    if test1_passed and test2_passed:
        logger.info("🎉 ALL TESTS PASSED! Boxplot limit successfully removed!")
    else:
        logger.error("❌ SOME TESTS FAILED! Check output above.")
    logger.info("=" * 70)
