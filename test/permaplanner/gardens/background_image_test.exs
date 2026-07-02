defmodule Permaplanner.Gardens.BackgroundImageTest do
  use ExUnit.Case, async: true

  alias Permaplanner.Gardens.BackgroundImage

  @png_data_url "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  test "parse_data_url/1 decodes content type and bytes" do
    assert {:ok, "image/png", bytes} = BackgroundImage.parse_data_url(@png_data_url)
    assert byte_size(bytes) > 0
  end

  test "split_from_document/1 returns unchanged when key is absent" do
    document = %{"plants" => []}

    assert {^document, :unchanged} = BackgroundImage.split_from_document(document)
  end

  test "split_from_document/1 clears when key is null" do
    document = %{"backgroundImage" => nil, "plants" => []}

    assert {%{"plants" => []}, :clear} = BackgroundImage.split_from_document(document)
  end

  test "split_from_document/1 sets bytes when key is a data url" do
    document = %{"backgroundImage" => @png_data_url}

    assert {stored, {:set, "image/png", bytes}} = BackgroundImage.split_from_document(document)
    refute Map.has_key?(stored, "backgroundImage")
    assert byte_size(bytes) > 0
  end
end
