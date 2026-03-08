# Example job, models not yet implemented
from core.models.training import train_model_pipeline


def train_model(symbol):

    print(f"Training model for {symbol}")

    train_model_pipeline(symbol)