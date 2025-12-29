import pandas as pd
import numpy as np
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_file(file_path):
    print(f"Analyzing {file_path}...")
    try:
        df_raw = pd.read_excel(file_path, header=None)
        print("First 5 rows raw:")
        print(df_raw.head())
        
        # Simulate find data trigger
        data_col_idx = None
        header_row_idx = 0
        for row_idx in range(min(5, len(df_raw))):
            for col_idx in range(len(df_raw.columns)):
                val = str(df_raw.iloc[row_idx, col_idx]).strip().upper()
                if val == 'DATA':
                    data_col_idx = col_idx
                    header_row_idx = row_idx
                    print(f"DATA trigger found at row {row_idx}, col {col_idx}")
                    break
            if data_col_idx is not None:
                break
                
        if data_col_idx is not None:
            # Re-read with header
            df = pd.read_excel(file_path, header=header_row_idx)
            print(f"\nDataFrame loaded with header at row {header_row_idx}:")
            print(df.columns.tolist())
            
            # Check for Row_index column
            for col in df.columns:
                if 'Row' in str(col) or 'Index' in str(col):
                    print(f"Found potential index column: {col}")
                    
            # Check unique values logic
            for col in df.columns[:data_col_idx]:
                unique = df[col].nunique()
                print(f"Column '{col}' (left of DATA): {unique} unique values")
                if unique > 50:
                    print(f"  -> Would be skipped in metadata due to >50 unique values")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_file("/Users/macbro/Projects/Dad's/TOY-DATA mini.xlsx")
