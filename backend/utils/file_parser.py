"""
File Parser Utility - V2.0
Handles CSV and Excel file parsing with DATA trigger support
"""
import logging
from io import BytesIO

import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)


async def preview_file(file: UploadFile) -> dict:
    """
    Preview file structure WITHOUT running analysis
    Detects DATA trigger and extracts metadata columns
    SIMPLIFIED - like MATLAB approach
    
    Args:
        file: Uploaded file
    
    Returns:
        {
            "trigger_found": bool,
            "trigger_column": str | None,
            "metadata_columns": [{"name": str, "unique_count": int, "sample_values": list}],
            "variable_names": list[str],
            "num_samples": int,
            "num_variables": int
        }
    """
    try:
        contents = await file.read()
        await file.seek(0)  # Reset file pointer for potential reuse
        
        # Load file WITHOUT header first to search for DATA
        if file.filename.endswith('.csv'):
            df_raw = pd.read_csv(BytesIO(contents), header=None)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df_raw = pd.read_excel(BytesIO(contents), header=None)
        else:
            raise ValueError(f"Unsupported file format: {file.filename}")
        
        # Find DATA trigger in raw data
        data_col_idx = None
        header_row_idx = 0
        
        # Search for DATA in first 5 rows
        for row_idx in range(min(5, len(df_raw))):
            for col_idx in range(len(df_raw.columns)):
                val = str(df_raw.iloc[row_idx, col_idx]).strip().upper()
                if val == 'DATA':
                    data_col_idx = col_idx
                    header_row_idx = row_idx
                    logger.info(f"✅ DATA found at row {row_idx}, column {col_idx}")
                    break
            if data_col_idx is not None:
                break
        
        # Re-read with correct header
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), header=header_row_idx)
        else:
            df = pd.read_excel(BytesIO(contents), header=header_row_idx)
        
        # Fix unnamed columns: variable names are in row ABOVE DATA
        if data_col_idx is not None:
            new_columns = []
            # Variable names are in the row ABOVE where DATA was found
            var_names_row_idx = max(0, header_row_idx - 1) if header_row_idx > 0 else header_row_idx
            
            for idx, col in enumerate(df.columns):
                col_str = str(col)
                # If unnamed AND it's after DATA column
                if 'Unnamed' in col_str and idx > data_col_idx:
                    # Get name from row ABOVE DATA
                    try:
                        var_name = str(df_raw.iloc[var_names_row_idx, idx]).strip()
                        if var_name and var_name != 'nan' and var_name.upper() != 'NAN':
                            new_columns.append(var_name)
                        else:
                            new_columns.append(f'Variable_{idx - data_col_idx}')
                    except:
                        new_columns.append(f'Variable_{idx - data_col_idx}')
                else:
                    new_columns.append(col)
            df.columns = new_columns
            logger.info(f"✅ Fixed column names from row {var_names_row_idx}: {list(df.columns[data_col_idx+1:data_col_idx+6])}...")
        
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        logger.info(f"Preview: {df.shape[0]} rows × {df.shape[1]} columns, header at row {header_row_idx}")
        
        # Now find DATA in column names
        trigger_idx = None
        for idx, col_name in enumerate(df.columns):
            if str(col_name).strip().upper() == 'DATA':
                trigger_idx = idx
                logger.info(f"✅ DATA trigger at column {idx}: '{col_name}'")
                break
        
        if trigger_idx is not None:
            # Format with DATA trigger
            metadata_columns = extract_metadata_columns(df, trigger_idx)
            variable_names, num_variables = extract_variable_names(df, trigger_idx)
            
            # Get ALL rows for preview (limit to 1000 for performance)
            preview_rows = []
            max_preview_rows = min(1000, len(df))
            for idx in range(max_preview_rows):
                row_dict = {}
                for col in df.columns:
                    val = df.iloc[idx][col]
                    # Keep original value representation
                    if pd.isna(val):
                        row_dict[str(col)] = ""
                    else:
                        row_dict[str(col)] = str(val)
                preview_rows.append(row_dict)
            
            return {
                "trigger_found": True,
                "trigger_column": df.columns[trigger_idx],
                "metadata_columns": metadata_columns,
                "variable_names": variable_names,
                "num_samples": len(df),
                "num_variables": num_variables,
                "preview_rows": preview_rows,
                "all_columns": [str(col) for col in df.columns]
            }
        else:
            # Fallback: simple format without DATA trigger
            logger.warning("No DATA trigger found - using simple format detection")
            
            # Try to detect class column
            class_col_idx, class_col_name = _find_class_column_fallback(df)
            
            if class_col_idx is not None:
                unique_vals = df.iloc[:, class_col_idx].unique()
                # Safe sort: convert all to strings if mixed types
                try:
                    sample_values = sorted(unique_vals.tolist()[:10])
                except TypeError:
                    sample_values = sorted([str(x) for x in unique_vals.tolist()[:10]])
                
                metadata_columns = [{
                    "name": class_col_name,
                    "unique_count": len(unique_vals),
                    "sample_values": sample_values
                }]
                
                # Rest are variables
                var_names = [col for i, col in enumerate(df.columns) if i != class_col_idx]
                
                # Get ALL rows for preview (limit to 1000 for performance)
                preview_rows = []
                max_preview_rows = min(1000, len(df))
                for idx in range(max_preview_rows):
                    row_dict = {}
                    for col in df.columns:
                        val = df.iloc[idx][col]
                        # Keep original value representation
                        if pd.isna(val):
                            row_dict[str(col)] = ""
                        else:
                            row_dict[str(col)] = str(val)
                    preview_rows.append(row_dict)
                
                return {
                    "trigger_found": False,
                    "trigger_column": None,
                    "metadata_columns": metadata_columns,
                    "variable_names": var_names,
                    "num_samples": len(df),
                    "num_variables": len(var_names),
                    "preview_rows": preview_rows,
                    "all_columns": [str(col) for col in df.columns]
                }
            else:
                # No clear class column - treat first as class
                # Get ALL rows for preview (limit to 1000 for performance)
                preview_rows = []
                max_preview_rows = min(1000, len(df))
                for idx in range(max_preview_rows):
                    row_dict = {}
                    for col in df.columns:
                        val = df.iloc[idx][col]
                        # Keep original value representation
                        if pd.isna(val):
                            row_dict[str(col)] = ""
                        else:
                            row_dict[str(col)] = str(val)
                    preview_rows.append(row_dict)
                
                return {
                    "trigger_found": False,
                    "trigger_column": None,
                    "metadata_columns": [{
                        "name": df.columns[0],
                        "unique_count": len(df.iloc[:, 0].unique()),
                        "sample_values": sorted(df.iloc[:, 0].unique().tolist()[:10])
                    }],
                    "variable_names": df.columns[1:].tolist(),
                    "num_samples": len(df),
                    "num_variables": len(df.columns) - 1,
                    "preview_rows": preview_rows,
                    "all_columns": [str(col) for col in df.columns]
                }
        
    except Exception as e:
        logger.error(f"File preview failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"File preview error: {str(e)}")


def find_data_trigger(df: pd.DataFrame) -> int | None:
    """
    Find the DATA trigger column - search in column names AND in first few rows
    Like MATLAB: look for 'DATA' anywhere in the file structure
    
    Args:
        df: DataFrame
    
    Returns:
        Column index of DATA trigger, or None if not found
    """
    # Strategy 1: Search in column names
    for idx, col_name in enumerate(df.columns):
        col_str = str(col_name).strip().upper()
        if col_str == 'DATA':
            logger.info(f"✅ DATA trigger found in columns at index {idx} ('{col_name}')")
            return idx
    
    # Strategy 2: Search in first 5 rows (maybe header is not row 0)
    for row_idx in range(min(5, len(df))):
        for col_idx, value in enumerate(df.iloc[row_idx]):
            val_str = str(value).strip().upper()
            if val_str == 'DATA':
                logger.info(f"✅ DATA trigger found in row {row_idx}, column {col_idx}")
                # Found DATA in data - this row is probably the header
                # Re-read with proper header
                return col_idx
    
    logger.warning("⚠️ No DATA trigger found in columns or first 5 rows")
    return None


def extract_metadata_columns(df: pd.DataFrame, trigger_idx: int) -> list[dict]:
    """
    Extract all columns LEFT of DATA trigger as metadata (potential classes)
    
    Args:
        df: DataFrame
        trigger_idx: Index of DATA column
    
    Returns:
        List of metadata column info
    """
    metadata_cols = []
    
    for idx in range(trigger_idx):
        col_name = df.columns[idx]
        col_data = df.iloc[:, idx]
        
        # Get unique values
        unique_vals = col_data.dropna().unique()
        
        # Skip if too many unique values (likely ID column)
        if len(unique_vals) > 50:
            logger.info(f"Skipping '{col_name}' - too many unique values ({len(unique_vals)})")
            continue
        
        # Sort sample values for better display (handle mixed types)
        try:
            sample_values = sorted(unique_vals.tolist()[:10])
        except TypeError:
            # Mixed types - convert to strings for sorting
            sample_values = sorted([str(x) for x in unique_vals.tolist()[:10]])
        except Exception:
            # Any other error - just use unsorted
            sample_values = unique_vals.tolist()[:10]
        
        metadata_cols.append({
            "name": str(col_name),
            "unique_count": len(unique_vals),
            "sample_values": sample_values
        })
        
        logger.info(f"Metadata column: '{col_name}' ({len(unique_vals)} unique values)")
    
    return metadata_cols


def extract_variable_names(df: pd.DataFrame, trigger_idx: int) -> tuple[list[str], int]:
    """
    Extract variable names RIGHT of DATA trigger
    
    Args:
        df: DataFrame
        trigger_idx: Index of DATA column
    
    Returns:
        (variable_names, num_variables)
    """
    # All columns after DATA trigger
    variable_names = df.columns[trigger_idx + 1:].tolist()
    
    logger.info(f"Variables: {len(variable_names)} columns starting from '{variable_names[0] if variable_names else 'N/A'}'")
    
    return variable_names, len(variable_names)


async def parse_uploaded_file(
    file: UploadFile,
    class_column: str
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """
    Parse uploaded file with specified class column
    SIMPLIFIED - like MATLAB
    
    Args:
        file: Uploaded file
        class_column: Name of the column to use as classes
    
    Returns:
        (data, classes, variable_names) tuple
    """
    try:
        contents = await file.read()
        
        # Load WITHOUT header first to find DATA
        if file.filename.endswith('.csv'):
            df_raw = pd.read_csv(BytesIO(contents), header=None)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df_raw = pd.read_excel(BytesIO(contents), header=None)
        else:
            raise ValueError(f"Unsupported file format: {file.filename}")
        
        # Find DATA and header row
        header_row_idx = 0
        for row_idx in range(min(5, len(df_raw))):
            for col_idx in range(len(df_raw.columns)):
                if str(df_raw.iloc[row_idx, col_idx]).strip().upper() == 'DATA':
                    header_row_idx = row_idx
                    logger.info(f"✅ DATA found at row {row_idx}, using as header")
                    break
            if header_row_idx > 0:
                break
        
        # Re-read with correct header
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), header=header_row_idx)
        else:
            df = pd.read_excel(BytesIO(contents), header=header_row_idx)
        
        # Fix unnamed columns: variable names in row ABOVE DATA
        if header_row_idx > 0:
            # Find DATA column in loaded df
            data_col_in_df = None
            for idx, col in enumerate(df.columns):
                if str(col).strip().upper() == 'DATA':
                    data_col_in_df = idx
                    break
            
            if data_col_in_df is not None:
                new_columns = []
                # Variable names are in row ABOVE DATA
                var_names_row_idx = max(0, header_row_idx - 1)
                
                for idx, col in enumerate(df.columns):
                    col_str = str(col)
                    # If unnamed AND after DATA
                    if 'Unnamed' in col_str and idx > data_col_in_df:
                        # Get from row ABOVE DATA
                        try:
                            var_name = str(df_raw.iloc[var_names_row_idx, idx]).strip()
                            if var_name and var_name != 'nan' and var_name.upper() != 'NAN':
                                new_columns.append(var_name)
                            else:
                                new_columns.append(f'Var_{idx - data_col_in_df}')
                        except:
                            new_columns.append(f'Var_{idx - data_col_in_df}')
                    else:
                        new_columns.append(col)
                df.columns = new_columns
                logger.info(f"✅ Fixed variable names from row {var_names_row_idx}")
        
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        logger.info(f"Loaded file: {df.shape[0]} rows × {df.shape[1]} columns, header at row {header_row_idx}")
        
        # Find DATA trigger in columns
        trigger_idx = None
        for idx, col_name in enumerate(df.columns):
            if str(col_name).strip().upper() == 'DATA':
                trigger_idx = idx
                logger.info(f"✅ DATA trigger at column {idx}")
                break
        
        # Validate class_column exists (convert to string for comparison)
        df.columns = [str(col) for col in df.columns]
        
        if class_column not in df.columns:
            # Try to find it as int column
            try:
                class_col_int = int(class_column)
                if class_col_int in [int(col) if col.isdigit() else col for col in df.columns]:
                    class_column = str(class_col_int)
                else:
                    raise ValueError(f"Class column '{class_column}' not found. Available: {df.columns.tolist()[:20]}...")
            except (ValueError, AttributeError):
                raise ValueError(f"Class column '{class_column}' not found. Available: {df.columns.tolist()[:20]}...")
        
        # Extract classes
        classes = _convert_to_class_labels(df[class_column])
        logger.info(f"Classes: {len(np.unique(classes))} unique groups from column '{class_column}'")
        
        # Extract data columns
        if trigger_idx is not None:
            # Use DATA trigger: all columns RIGHT of DATA
            data_cols = df.columns[trigger_idx + 1:]
            var_names = data_cols.tolist()
            
            logger.info(f"Using DATA trigger: {len(data_cols)} variables")
        else:
            # Fallback: all columns except class column and ID-like columns
            id_keywords = ['id', 'sample', 'patient', 'subject', 'name']
            
            data_cols = []
            for col in df.columns:
                if col == class_column:
                    continue
                if any(keyword in str(col).lower() for keyword in id_keywords):
                    logger.info(f"Skipping ID column: {col}")
                    continue
                data_cols.append(col)
            
            var_names = data_cols
            logger.info(f"Fallback mode: {len(data_cols)} variables")
        
        # Extract numeric data (handle European decimal format with comma)
        data_df = df[data_cols].copy()
        for col in data_df.columns:
            # Replace comma decimal separator with period
            data_df[col] = data_df[col].astype(str).str.replace(',', '.', regex=False)
        data_df = data_df.apply(pd.to_numeric, errors='coerce')
        data = data_df.values
            
        # Remove rows with all NaN in data
        valid_rows = ~np.all(np.isnan(data), axis=1)
        data = data[valid_rows]
        classes = classes[valid_rows]
        
        # Validate
        if data.shape[0] < 3:
            raise ValueError("Insufficient samples (minimum 3 required)")
        if data.shape[1] < 2:
            raise ValueError("Insufficient variables (minimum 2 required)")
        if len(np.unique(classes)) < 2:
            raise ValueError(f"Insufficient groups (minimum 2 required, found {len(np.unique(classes))})")
        
        logger.info(f"✅ Parsed: {data.shape[0]} samples × {data.shape[1]} variables, {len(np.unique(classes))} groups")
        
        return data, classes, var_names
        
    except Exception as e:
        logger.error(f"File parsing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")


def _find_class_column_fallback(df: pd.DataFrame) -> tuple[int | None, str | None]:
    """
    Fallback: Find class column when DATA trigger is not present
    
    Strategy:
    1. Look for columns named: 'Group', 'Class', 'Treatment', etc.
    2. Find column with 2-10 unique values
    
    Returns:
        (column_index, column_name) or (None, None)
    """
    class_keywords = ['group', 'class', 'treatment', 'label', 'category', 'type', 'condition']
    id_keywords = ['id', 'sample', 'patient', 'subject', 'name']
    
    # Strategy 1: Look for known class column names
    for idx, col_name in enumerate(df.columns):
        col_lower = str(col_name).lower()
        
        # Skip ID columns
        if any(keyword in col_lower for keyword in id_keywords):
            continue
        
        # Check if matches class keywords
        if any(keyword in col_lower for keyword in class_keywords):
            if _is_class_column(df.iloc[:, idx]):
                return idx, col_name
    
    # Strategy 2: Find first non-ID column with 2-10 unique values
    for idx, col_name in enumerate(df.columns):
        col_lower = str(col_name).lower()
        
        # Skip ID columns
        if any(keyword in col_lower for keyword in id_keywords):
            continue
        
        if _is_class_column(df.iloc[:, idx]):
            return idx, col_name
    
    return None, None


def _is_class_column(series: pd.Series) -> bool:
    """Check if a column represents class labels"""
    try:
        # Remove NaNs
        series_clean = series.dropna()
        
        if len(series_clean) == 0:
            return False
        
        n_unique = len(series_clean.unique())
        
        # Check if it has 2-10 unique values (typical for classes)
        # and not too many (more than 50% would be IDs)
        if 2 <= n_unique <= 10 and n_unique < len(series_clean) * 0.5:
            return True
        
        return False
    except:
        return False


def _convert_to_class_labels(series: pd.Series) -> np.ndarray:
    """
    Convert class labels to integer array
    Handles: integers (1,2,3), letters (A,B,C), or strings (Group1, Group2)
    """
    try:
        # If already integers
        if pd.api.types.is_integer_dtype(series):
            return series.values.astype(int)
        
        # If numeric strings
        numeric = pd.to_numeric(series, errors='coerce')
        if not numeric.isna().any():
            return numeric.astype(int).values
        
        # If categorical (letters or strings)
        # Map unique values to integers
        unique_vals = series.unique()
        mapping = {val: idx + 1 for idx, val in enumerate(sorted(unique_vals))}
        
        logger.info(f"Converting class labels: {mapping}")
        
        return series.map(mapping).values.astype(int)
        
    except Exception as e:
        logger.error(f"Failed to convert class labels: {e}")
        raise ValueError(f"Cannot convert class labels: {e}")
